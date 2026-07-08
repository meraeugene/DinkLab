import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";
import { createAdminClient } from "@/utils/supabase/admin";
import type { JoinedCourt } from "@/types/admin/adminBooking";

export async function getAcceptedBookings(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id,start_at,end_at,accepted_at,courts(name)")
    .eq("user_id", userId)
    .eq("status", "ACCEPTED")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(8);

  return (data || []).map((booking) => ({
    id: booking.id,
    courtName: getJoinedCourtName(booking.courts as JoinedCourt),
    startAt: booking.start_at,
    endAt: booking.end_at,
    acceptedAt: booking.accepted_at,
  }));
}
