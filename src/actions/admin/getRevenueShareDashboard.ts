"use server";

import type { JoinedCourt } from "@/types/admin/adminBooking";
import type {
  RevenueShareDashboardData,
  RevenueShareEntry,
} from "@/types/admin/revenueShare";
import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";

const REVENUE_SHARE_OWNER_EMAIL = "andrewvillalon.dev@gmail.com";
const COMMISSION_RATE = 0.05;
const QUERY_BATCH_SIZE = 1000;

type RevenueBookingRow = {
  id: string;
  booking_group_id: string;
  user_email: string;
  customer_name: string;
  start_at: string;
  end_at: string;
  total_amount: number;
  downpayment_amount: number;
  courts: JoinedCourt;
};

export async function getRevenueShareDashboard(): Promise<RevenueShareDashboardData | null> {
  const adminUser = await requireAdmin();
  if (adminUser?.email?.toLowerCase() !== REVENUE_SHARE_OWNER_EMAIL) {
    return null;
  }

  const admin = createAdminClient();
  const rows: RevenueBookingRow[] = [];

  let offset = 0;
  for (;;) {
    const { count, data, error } = await admin
      .from("bookings")
      .select(
        "id,booking_group_id,user_email,customer_name,start_at,end_at,total_amount,downpayment_amount,courts(name)",
        { count: "exact" },
      )
      .eq("status", "ACCEPTED")
      .order("start_at", { ascending: false })
      .range(offset, offset + QUERY_BATCH_SIZE - 1);

    if (error) {
      throw new Error("Unable to load the private revenue-share dashboard.");
    }

    const batch = (data || []) as RevenueBookingRow[];
    rows.push(...batch);
    offset += batch.length;
    if (!batch.length || (count !== null && rows.length >= count)) break;
  }

  return {
    commissionRate: COMMISSION_RATE,
    generatedAt: new Date().toISOString(),
    entries: groupRevenueBookings(rows),
  };
}

function groupRevenueBookings(rows: RevenueBookingRow[]): RevenueShareEntry[] {
  const groups = new Map<string, RevenueBookingRow[]>();
  const groupCounts = new Map<string, number>();
  for (const row of rows) {
    groupCounts.set(
      row.booking_group_id,
      (groupCounts.get(row.booking_group_id) || 0) + 1,
    );
  }
  for (const row of rows) {
    const key = getRevenueGroupKey(row, groupCounts);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  const currentTime = Date.now();

  return [...groups.entries()]
    .map(([bookingGroupId, group]) => {
      const sorted = [...group].sort(
        (first, second) =>
          new Date(first.start_at).getTime() -
          new Date(second.start_at).getTime(),
      );
      const first = sorted[0];
      const endAt = sorted.reduce(
        (latest, row) =>
          new Date(row.end_at).getTime() > new Date(latest).getTime()
            ? row.end_at
            : latest,
        first.end_at,
      );
      const bookingValue = sorted.reduce(
        (total, row) => total + row.total_amount,
        0,
      );
      const recordedPayment = sorted.reduce(
        (total, row) => total + row.downpayment_amount,
        0,
      );
      const developerShare = bookingValue * COMMISSION_RATE;
      const paymentStatus: RevenueShareEntry["paymentStatus"] =
        recordedPayment >= bookingValue
          ? "PAID"
          : recordedPayment > 0
            ? "PARTIAL"
            : "UNPAID";
      const timing: RevenueShareEntry["timing"] =
        new Date(endAt).getTime() <= currentTime ? "COMPLETED" : "UPCOMING";

      return {
        id: first.id,
        bookingGroupId,
        customerName: first.customer_name,
        customerEmail: first.user_email,
        courtNames: [
          ...new Set(sorted.map((row) => getJoinedCourtName(row.courts))),
        ],
        startAt: first.start_at,
        endAt,
        scheduleCount: sorted.length,
        bookingValue,
        recordedPayment,
        developerShare,
        earnedShare:
          timing === "COMPLETED" && paymentStatus === "PAID"
            ? developerShare
            : 0,
        paymentStatus,
        venueShare: bookingValue - developerShare,
        timing,
      } satisfies RevenueShareEntry;
    })
    .sort(
      (first, second) =>
        new Date(second.startAt).getTime() - new Date(first.startAt).getTime(),
    );
}

function getRevenueGroupKey(
  row: RevenueBookingRow,
  groupCounts: Map<string, number>,
) {
  if (
    row.user_email === "booking-list@dinklab.local" &&
    groupCounts.get(row.booking_group_id) === 1
  ) {
    return [
      "legacy-import",
      row.customer_name.trim().toLowerCase(),
      row.start_at,
      row.end_at,
    ].join("|");
  }

  return row.booking_group_id || row.id;
}
