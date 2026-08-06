import { NextResponse } from "next/server";
import { getHourlyRateFromBands } from "@/lib/pricing";
import { manilaHourToUtc } from "@/lib/time";
import type {
  BookingImportResponse,
  ImportedPaymentStatus,
} from "@/types/admin/bookingImport";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { parseBookingListWorkbook } from "@/utils/admin/parseBookingListWorkbook";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return importError("Choose a Dink Lab booking-list .xlsx file.");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return importError("Only the .xlsx booking-list format is supported.");
  }
  if (file.size > MAX_FILE_BYTES) {
    return importError("The Excel file must be 8 MB or smaller.");
  }

  try {
    const parsed = await parseBookingListWorkbook(
      Buffer.from(await file.arrayBuffer()),
    );
    const admin = createAdminClient();
    const [rules, courtsResult] = await Promise.all([
      getBusinessRules(),
      admin.from("courts").select("id,name"),
    ]);
    if (courtsResult.error) throw courtsResult.error;

    const courtByName = new Map(
      (courtsResult.data || []).map((court) => [
        normalizeCourtName(court.name),
        court,
      ]),
    );
    const bookingGroupIds = new Map<string, string>();
    const candidates = parsed.entries.flatMap((entry) => {
      const court = courtByName.get(normalizeCourtName(entry.courtName));
      if (!court) {
        parsed.warnings.push({
          location: `${entry.sourceSheet}!${entry.sourceCell}`,
          message: `Skipped because ${entry.courtName} does not exist in Business Settings.`,
        });
        return [];
      }

      const totalAmount = Array.from(
        { length: entry.endHour - entry.startHour },
        (_, index) =>
          getHourlyRateFromBands(
            entry.startHour + index,
            rules.pricingBands,
          ),
      ).reduce((sum, amount) => sum + amount, 0);
      const groupKey = [
        entry.sourceSheet,
        entry.customerName.toLowerCase(),
        entry.date,
        entry.startHour,
        entry.endHour,
      ].join("|");
      const bookingGroupId = bookingGroupIds.get(groupKey) || crypto.randomUUID();
      bookingGroupIds.set(groupKey, bookingGroupId);
      return [
        {
          ...entry,
          bookingGroupId,
          courtId: court.id,
          startAt: manilaHourToUtc(entry.date, entry.startHour).toISOString(),
          endAt: manilaHourToUtc(entry.date, entry.endHour).toISOString(),
          hourlyRate: getHourlyRateFromBands(
            entry.startHour,
            rules.pricingBands,
          ),
          totalAmount,
        },
      ];
    });

    if (!candidates.length) {
      return NextResponse.json(buildResponse(0, parsed.warnings, []));
    }

    const earliestStart = candidates.reduce(
      (earliest, booking) =>
        booking.startAt < earliest ? booking.startAt : earliest,
      candidates[0].startAt,
    );
    const latestEnd = candidates.reduce(
      (latest, booking) =>
        booking.endAt > latest ? booking.endAt : latest,
      candidates[0].endAt,
    );
    const existingResult = await admin
      .from("bookings")
      .select("court_id,start_at,end_at,customer_name")
      .eq("status", "ACCEPTED")
      .lt("start_at", latestEnd)
      .gt("end_at", earliestStart);
    if (existingResult.error) throw existingResult.error;

    const reserved = (existingResult.data || []).map((booking) => ({
      courtId: booking.court_id,
      startMs: new Date(booking.start_at).getTime(),
      endMs: new Date(booking.end_at).getTime(),
      customerName: booking.customer_name,
    }));
    const acceptedCandidates: typeof candidates = [];

    for (const candidate of candidates) {
      const candidateStartMs = new Date(candidate.startAt).getTime();
      const candidateEndMs = new Date(candidate.endAt).getTime();
      const conflict = reserved.find(
        (booking) =>
          booking.courtId === candidate.courtId &&
          booking.startMs < candidateEndMs &&
          booking.endMs > candidateStartMs,
      );
      if (conflict) {
        parsed.warnings.push({
          location: `${candidate.sourceSheet}!${candidate.sourceCell}`,
          message: `Skipped ${candidate.customerName}: the court is already reserved by ${conflict.customerName}.`,
        });
        continue;
      }
      acceptedCandidates.push(candidate);
      reserved.push({
        courtId: candidate.courtId,
        startMs: candidateStartMs,
        endMs: candidateEndMs,
        customerName: candidate.customerName,
      });
    }

    if (acceptedCandidates.length) {
      const reviewedAt = new Date().toISOString();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 80);
      const insertResult = await admin.from("bookings").insert(
        acceptedCandidates.map((booking) => ({
          booking_group_id: booking.bookingGroupId,
          court_id: booking.courtId,
          user_id: null,
          user_email: "booking-list@dinklab.local",
          customer_name: booking.customerName,
          customer_contact: "Imported from Excel",
          start_at: booking.startAt,
          end_at: booking.endAt,
          hourly_rate: booking.hourlyRate,
          total_amount: booking.totalAmount,
          downpayment_amount: getAmountPaid(
            booking.paymentStatus,
            booking.totalAmount,
          ),
          payment_method: "ONSITE",
          payment_status: booking.paymentStatus,
          status: "ACCEPTED",
          accepted_at: reviewedAt,
          reviewed_at: reviewedAt,
          reviewed_by_email: user.email,
          review_reason: `Imported from ${safeFileName} (${booking.sourceSheet}!${booking.sourceCell})`,
        })),
      );

      if (insertResult.error) {
        const message = insertResult.error.message.toLowerCase();
        if (
          message.includes("payment_status") ||
          message.includes("user_id") ||
          message.includes("downpayment_amount") ||
          message.includes("constraint") ||
          message.includes("booking_slot")
        ) {
          return importError(
            "Run the latest Supabase booking-import migration, then try again.",
            409,
          );
        }
        throw insertResult.error;
      }
    }

    return NextResponse.json(
      buildResponse(acceptedCandidates.length, parsed.warnings, acceptedCandidates),
    );
  } catch (error) {
    return importError(
      error instanceof Error ? error.message : "Unable to import the workbook.",
    );
  }
}

function normalizeCourtName(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function getAmountPaid(status: ImportedPaymentStatus, totalAmount: number) {
  if (status === "PAID") return totalAmount;
  if (status === "HALF_PAID") return Math.ceil(totalAmount / 2);
  return 0;
}

function buildResponse(
  importedCount: number,
  warnings: BookingImportResponse["warnings"],
  imported: Array<{ date: string; paymentStatus: ImportedPaymentStatus }>,
): BookingImportResponse {
  const paymentCounts: BookingImportResponse["paymentCounts"] = {
    PAID: 0,
    HALF_PAID: 0,
    UNPAID: 0,
  };
  for (const booking of imported) paymentCounts[booking.paymentStatus] += 1;

  return {
    ok: true,
    importedCount,
    skippedCount: warnings.length,
    firstImportedDate: imported.map((item) => item.date).sort()[0],
    paymentCounts,
    warnings: warnings.slice(0, 50),
  };
}

function importError(error: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error,
      importedCount: 0,
      skippedCount: 0,
      paymentCounts: { PAID: 0, HALF_PAID: 0, UNPAID: 0 },
      warnings: [],
    } satisfies BookingImportResponse,
    { status },
  );
}
