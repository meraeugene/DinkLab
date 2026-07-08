import { COURTS } from "@/data/app/appConfig";
import { manilaHourToUtc } from "@/lib/time";
import type { AdminScheduleBooking } from "@/types/admin/adminBooking";
import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getAdminSchedule(date: string) {
  const admin = createAdminClient();
  const dayStart = manilaHourToUtc(date, 0).toISOString();
  const dayEnd = manilaHourToUtc(date, 29).toISOString();
  const { data, error } = await admin
    .from("bookings")
    .select(
      "id,court_id,customer_name,customer_contact,start_at,end_at,payment_method,total_amount,courts(name)",
    )
    .eq("status", "ACCEPTED")
    .lt("start_at", dayEnd)
    .gt("end_at", dayStart)
    .order("start_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((booking) => ({
    id: booking.id,
    courtId: booking.court_id,
    courtName:
      getJoinedCourtName(booking.courts) ||
      COURTS.find((court) => court.id === booking.court_id)?.name ||
      "Court",
    customerName: booking.customer_name,
    customerContact: booking.customer_contact,
    startAt: booking.start_at,
    endAt: booking.end_at,
    paymentMethod: booking.payment_method,
    totalAmount: booking.total_amount,
  })) as AdminScheduleBooking[];
}
