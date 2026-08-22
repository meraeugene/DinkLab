import { NextResponse } from "next/server";
import type { BookingBackupRow } from "@/types/admin/bookingBackup";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const BACKUP_PAGE_SIZE = 1_000;
const BOOKING_BACKUP_COLUMNS = [
  "id",
  "booking_group_id",
  "court_id",
  "user_id",
  "user_email",
  "customer_name",
  "customer_avatar_url",
  "customer_contact",
  "start_at",
  "end_at",
  "hourly_rate",
  "total_amount",
  "downpayment_amount",
  "payment_method",
  "payment_status",
  "payment_reference",
  "payment_proof_url",
  "payment_proof_public_id",
  "status",
  "accepted_at",
  "cancelled_at",
  "reviewed_at",
  "reviewed_by_email",
  "review_reason",
  "reminder_sent_at",
  "reminder_email_error",
  "created_at",
  "updated_at",
].join(",");

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const bookings: BookingBackupRow[] = [];

  for (let offset = 0; ; offset += BACKUP_PAGE_SIZE) {
    const { data, error } = await admin
      .from("bookings")
      .select(BOOKING_BACKUP_COLUMNS)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + BACKUP_PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json(
        { error: "Unable to create the booking backup." },
        { status: 500 },
      );
    }

    bookings.push(...((data || []) as unknown as BookingBackupRow[]));
    if (!data || data.length < BACKUP_PAGE_SIZE) break;
  }

  const generatedAt = new Date().toISOString();
  const fileTimestamp = generatedAt.replace(/[:.]/g, "-");

  return new NextResponse(
    JSON.stringify(
      {
        format: "dinklab-bookings",
        version: 1,
        generatedAt,
        bookings,
      },
      null,
      2,
    ),
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="dinklab-bookings-${fileTimestamp}.json"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
