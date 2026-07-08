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
    totalAmount: 0,
    downpaymentAmount: 0,
    paymentMethod: "ONSITE" as const,
    status: "ACCEPTED" as const,
    acceptedAt: booking.accepted_at,
    reviewedAt: null,
    reviewReason: null,
  }));
}

export async function getUserBookingHistory(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id,court_id,start_at,end_at,total_amount,downpayment_amount,payment_method,status,accepted_at,reviewed_at,review_reason,courts(name)",
    )
    .eq("user_id", userId)
    .order("start_at", { ascending: false })
    .limit(24);

  const rows = data || [];
  const pendingRows = rows.filter(
    (booking) => booking.status === "PENDING_REVIEW",
  );
  const conflictIds = new Set<string>();

  if (pendingRows.length) {
    const earliestStart = pendingRows.reduce(
      (earliest, booking) =>
        new Date(booking.start_at).getTime() < new Date(earliest).getTime()
          ? booking.start_at
          : earliest,
      pendingRows[0].start_at,
    );
    const latestEnd = pendingRows.reduce(
      (latest, booking) =>
        new Date(booking.end_at).getTime() > new Date(latest).getTime()
          ? booking.end_at
          : latest,
      pendingRows[0].end_at,
    );
    const courtIds = [...new Set(pendingRows.map((booking) => booking.court_id))];
    const { data: acceptedRows } = await admin
      .from("bookings")
      .select("id,court_id,start_at,end_at")
      .in("court_id", courtIds)
      .eq("status", "ACCEPTED")
      .lt("start_at", latestEnd)
      .gt("end_at", earliestStart);

    for (const pendingBooking of pendingRows) {
      const hasConflict = (acceptedRows || []).some(
        (acceptedBooking) =>
          acceptedBooking.id !== pendingBooking.id &&
          acceptedBooking.court_id === pendingBooking.court_id &&
          new Date(acceptedBooking.start_at).getTime() <
            new Date(pendingBooking.end_at).getTime() &&
          new Date(acceptedBooking.end_at).getTime() >
            new Date(pendingBooking.start_at).getTime(),
      );

      if (hasConflict) {
        conflictIds.add(pendingBooking.id);
      }
    }
  }

  return rows.map((booking) => ({
    id: booking.id,
    courtName: getJoinedCourtName(booking.courts as JoinedCourt),
    startAt: booking.start_at,
    endAt: booking.end_at,
    totalAmount: booking.total_amount,
    downpaymentAmount: booking.downpayment_amount,
    paymentMethod: booking.payment_method,
    status: booking.status,
    acceptedAt: booking.accepted_at,
    reviewedAt: booking.reviewed_at,
    reviewReason: booking.review_reason,
    hasReservedConflict: conflictIds.has(booking.id),
  }));
}
