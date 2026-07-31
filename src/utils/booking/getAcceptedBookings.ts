import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";
import { createAdminClient } from "@/utils/supabase/admin";
import type { JoinedCourt } from "@/types/admin/adminBooking";
import type { UserBooking } from "@/types/userBooking";

type BookingRow = {
  id: string;
  booking_group_id: string;
  court_id: string;
  start_at: string;
  end_at: string;
  total_amount: number;
  downpayment_amount: number;
  payment_method: "BPI" | "GOTYME" | "ONSITE";
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED" | "REJECTED";
  accepted_at: string | null;
  reviewed_at: string | null;
  review_reason: string | null;
  courts: JoinedCourt;
};

export async function getAcceptedBookings(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id,booking_group_id,court_id,start_at,end_at,total_amount,downpayment_amount,payment_method,status,accepted_at,reviewed_at,review_reason,courts(name)",
    )
    .eq("user_id", userId)
    .eq("status", "ACCEPTED")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .range(0, 199);

  return groupUserBookings((data || []) as BookingRow[]).slice(0, 8);
}

export async function getUserBookingHistory(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id,booking_group_id,court_id,start_at,end_at,total_amount,downpayment_amount,payment_method,status,accepted_at,reviewed_at,review_reason,courts(name)",
    )
    .eq("user_id", userId)
    .order("start_at", { ascending: false })
    .range(0, 499);

  const rows = (data || []) as BookingRow[];
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
      if (hasConflict) conflictIds.add(pendingBooking.id);
    }
  }

  return groupUserBookings(rows, conflictIds).slice(0, 24);
}

function groupUserBookings(
  rows: BookingRow[],
  conflictIds = new Set<string>(),
): UserBooking[] {
  const groups = new Map<string, BookingRow[]>();
  for (const row of rows) {
    const key = row.booking_group_id || row.id;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([bookingGroupId, group]) => {
    const sorted = [...group].sort(
      (first, second) =>
        new Date(first.start_at).getTime() - new Date(second.start_at).getTime(),
    );
    const first = sorted[0];
    const latestEnd = sorted.reduce(
      (latest, row) =>
        new Date(row.end_at).getTime() > new Date(latest).getTime()
          ? row.end_at
          : latest,
      first.end_at,
    );
    const courtNames = [
      ...new Set(sorted.map((row) => getJoinedCourtName(row.courts))),
    ];

    return {
      id: first.id,
      bookingGroupId,
      courtName: courtNames.join(" + "),
      startAt: first.start_at,
      endAt: latestEnd,
      totalAmount: sorted.reduce((sum, row) => sum + row.total_amount, 0),
      downpaymentAmount: sorted.reduce(
        (sum, row) => sum + row.downpayment_amount,
        0,
      ),
      paymentMethod: first.payment_method,
      status: first.status,
      acceptedAt: first.accepted_at,
      reviewedAt: first.reviewed_at,
      reviewReason: first.review_reason,
      hasReservedConflict: sorted.some((row) => conflictIds.has(row.id)),
      schedule: sorted.map((row) => ({
        id: row.id,
        courtName: getJoinedCourtName(row.courts),
        startAt: row.start_at,
        endAt: row.end_at,
        totalAmount: row.total_amount,
      })),
    };
  });
}
