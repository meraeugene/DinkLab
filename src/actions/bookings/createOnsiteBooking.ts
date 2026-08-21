"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getHourlyRateFromBands,
  getPromoHourlyRate,
} from "@/lib/pricing";
import { manilaHourToUtc } from "@/lib/time";
import { getAdminMutationLockError } from "@/utils/admin/getAdminMutationLockError";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { hasSlotConflict } from "@/utils/booking/bookingAvailability";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";
import { createAdminClient } from "@/utils/supabase/admin";

const onsiteScheduleSchema = z.object({
  courtId: z.string().min(1, "Select a court."),
  startHour: z.coerce.number().int().min(0).max(28),
  endHour: z.coerce.number().int().min(1).max(29),
});

const onsiteBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date."),
  schedules: z
    .array(onsiteScheduleSchema)
    .min(1, "Add at least one court and time.")
    .max(20, "Add no more than 20 schedules at once."),
  customerName: z.string().trim().min(2, "Enter the customer's name.").max(120),
  customerContact: z.string().trim().min(3, "Enter a contact number.").max(30),
  paymentStatus: z.enum(["PAID", "HALF_PAID", "UNPAID"]),
});

export async function createOnsiteBooking(formData: FormData) {
  const adminUser = await requireAdmin();
  if (!adminUser?.email) return { ok: false, error: "Unauthorized." };

  const lockError = getAdminMutationLockError();
  if (lockError) return { ok: false, error: lockError };

  let schedules: unknown = [];
  try {
    schedules = JSON.parse(String(formData.get("schedules") || "[]"));
  } catch {
    return { ok: false, error: "The selected courts and times are invalid." };
  }

  const parsed = onsiteBookingSchema.safeParse({
    date: formData.get("date"),
    schedules,
    customerName: formData.get("customerName"),
    customerContact: formData.get("customerContact"),
    paymentStatus: formData.get("paymentStatus"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Check the booking details." };
  }

  const rules = await getBusinessRules();
  const normalizedSchedules = parsed.data.schedules
    .map((schedule) => ({
      ...schedule,
      courtId: normalizeCourtId(schedule.courtId),
    }))
    .sort(
      (first, second) =>
        String(first.courtId).localeCompare(String(second.courtId)) ||
        first.startHour - second.startHour ||
        first.endHour - second.endHour,
    );

  if (normalizedSchedules.some((schedule) => !schedule.courtId)) {
    return { ok: false, error: "Select a valid court for every schedule." };
  }
  if (normalizedSchedules.some((schedule) => schedule.endHour <= schedule.startHour)) {
    return { ok: false, error: "Every end time must be after its start time." };
  }
  if (normalizedSchedules.some(
    (schedule) =>
      schedule.startHour < rules.settings.openHour ||
      schedule.endHour > rules.settings.closeHour,
  )) {
    return { ok: false, error: "Choose a time within operating hours." };
  }
  if (hasInternalScheduleOverlap(normalizedSchedules)) {
    return {
      ok: false,
      error: "Two schedules overlap on the same court. Adjust or remove one of them.",
    };
  }

  const scheduleItems = normalizedSchedules.map((schedule) => {
    const rates = Array.from(
      { length: schedule.endHour - schedule.startHour },
      (_, index) => schedule.startHour + index,
    ).map((hour) =>
      getPromoHourlyRate(
        parsed.data.date,
        hour,
        getHourlyRateFromBands(hour, rules.pricingBands),
      ),
    );
    return {
      courtId: schedule.courtId!,
      startAt: manilaHourToUtc(parsed.data.date, schedule.startHour),
      endAt: manilaHourToUtc(parsed.data.date, schedule.endHour),
      hourlyRate: rates[0],
      totalAmount: rates.reduce((sum, rate) => sum + rate, 0),
    };
  });
  if (scheduleItems.some((schedule) => schedule.startAt.getTime() <= Date.now())) {
    return { ok: false, error: "Choose future times for every onsite schedule." };
  }

  const admin = createAdminClient();
  const courtIds = [...new Set(scheduleItems.map((schedule) => schedule.courtId))];
  const { data: selectedCourts, error: courtError } = await admin
    .from("courts")
    .select("id")
    .in("id", courtIds);
  if (courtError || (selectedCourts || []).length !== courtIds.length) {
    return { ok: false, error: "One of the selected courts does not exist." };
  }

  const conflicts = await Promise.all(
    scheduleItems.map((schedule) =>
      hasSlotConflict(
        schedule.courtId,
        schedule.startAt.toISOString(),
        schedule.endAt.toISOString(),
      ),
    ),
  );
  if (conflicts.some(Boolean)) {
    return {
      ok: false,
      error: "One or more selected court times are already booked.",
    };
  }

  const now = new Date().toISOString();
  const bookingGroupId = crypto.randomUUID();

  const bookingPayload = scheduleItems.map((schedule) => ({
    booking_group_id: bookingGroupId,
    court_id: schedule.courtId,
    user_id: null,
    user_email: adminUser.email,
    customer_name: parsed.data.customerName,
    customer_contact: parsed.data.customerContact,
    start_at: schedule.startAt.toISOString(),
    end_at: schedule.endAt.toISOString(),
    hourly_rate: schedule.hourlyRate,
    total_amount: schedule.totalAmount,
    downpayment_amount:
      parsed.data.paymentStatus === "PAID"
        ? schedule.totalAmount
        : parsed.data.paymentStatus === "HALF_PAID"
          ? schedule.totalAmount / 2
          : 0,
    payment_method: "ONSITE",
    payment_status: parsed.data.paymentStatus,
    payment_reference: null,
    payment_proof_url: null,
    payment_proof_public_id: null,
    status: "ACCEPTED",
    accepted_at: now,
    reviewed_at: now,
    reviewed_by_email: adminUser.email,
    review_reason: "Added directly by admin as an onsite booking.",
  }));

  const { error } = await admin.from("bookings").insert(bookingPayload);

  if (error) {
    if (
      error.code === "23P01" ||
      error.code === "23505" ||
      error.message.toLowerCase().includes("booking_slot")
    ) {
      return {
        ok: false,
        error: "One of those court times was just booked. Refresh the schedule and try again.",
      };
    }
    return { ok: false, error: `Unable to add onsite booking: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

function hasInternalScheduleOverlap(
  schedules: Array<{ courtId: string | null; startHour: number; endHour: number }>,
) {
  return schedules.some((schedule, index) =>
    schedules.slice(index + 1).some(
      (other) =>
        schedule.courtId === other.courtId &&
        schedule.startHour < other.endHour &&
        schedule.endHour > other.startHour,
    ),
  );
}
