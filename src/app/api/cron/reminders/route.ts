import { NextResponse } from "next/server";
import { sendReminderEmail } from "@/utils/email/bookingEmail";
import { createAdminClient } from "@/utils/supabase/admin";
import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";

type JoinedCourt = { name: string } | { name: string }[] | null;

type ReminderBooking = {
  id: string;
  customer_name: string;
  user_email: string;
  start_at: string;
  end_at: string;
  total_amount: number;
  courts: JoinedCourt;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!process.env.CRON_SECRET || !token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dueUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("bookings")
    .select("id,customer_name,user_email,start_at,end_at,total_amount,courts(name)")
    .eq("status", "ACCEPTED")
    .is("reminder_sent_at", null)
    .gt("start_at", now.toISOString())
    .lte("start_at", dueUntil.toISOString())
    .order("start_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: "Unable to load reminder bookings." },
      { status: 500 },
    );
  }

  const bookings = (data || []) as ReminderBooking[];
  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      await sendReminderEmail({
        customerName: booking.customer_name,
        to: booking.user_email,
        startAt: booking.start_at,
        endAt: booking.end_at,
        totalAmount: booking.total_amount,
        courtName: getJoinedCourtName(booking.courts),
      });
      sent += 1;
      await admin
        .from("bookings")
        .update({
          reminder_sent_at: new Date().toISOString(),
          reminder_email_error: null,
        })
        .eq("id", booking.id);
    } catch (emailError) {
      failed += 1;
      await admin
        .from("bookings")
        .update({
          reminder_email_error:
            emailError instanceof Error
              ? emailError.message.slice(0, 500)
              : "Unknown reminder email error",
        })
        .eq("id", booking.id);
    }
  }

  return NextResponse.json({ checked: bookings.length, failed, sent });
}
