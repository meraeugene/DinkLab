import { NextResponse } from "next/server";
import type {
  AdminBookingNotification,
  JoinedCourt,
} from "@/types/admin/adminBooking";
import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";
import { isMissingAvatarColumn } from "@/utils/supabase/isMissingAvatarColumn";

type AdminNotificationRow = {
  id: string;
  booking_group_id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  start_at: string;
  end_at: string;
  created_at: string;
  payment_method: "BPI" | "GOTYME" | "ONSITE";
  downpayment_amount: number;
  total_amount: number;
  courts: JoinedCourt;
};

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const withAvatar = await admin
    .from("bookings")
    .select(
      "id,booking_group_id,customer_name,customer_avatar_url,start_at,end_at,created_at,payment_method,downpayment_amount,total_amount,courts(name)",
    )
    .eq("status", "PENDING_REVIEW")
    .order("created_at", { ascending: false })
    .limit(100);

  let rows = (withAvatar.data || []) as AdminNotificationRow[];
  let error = withAvatar.error;

  if (withAvatar.error && isMissingAvatarColumn(withAvatar.error)) {
    const fallback = await admin
      .from("bookings")
      .select(
        "id,booking_group_id,customer_name,start_at,end_at,created_at,payment_method,downpayment_amount,total_amount,courts(name)",
      )
      .eq("status", "PENDING_REVIEW")
      .order("created_at", { ascending: false })
      .limit(100);

    rows = (fallback.data || []).map((row) => ({
      ...row,
      customer_avatar_url: null,
    })) as AdminNotificationRow[];
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json(
      { error: "Unable to load admin notifications." },
      { status: 500 },
    );
  }

  const groupedRows = new Map<string, AdminNotificationRow[]>();
  for (const row of rows) {
    const group = groupedRows.get(row.booking_group_id) || [];
    group.push(row);
    groupedRows.set(row.booking_group_id, group);
  }

  const notifications: AdminBookingNotification[] = [...groupedRows.values()]
    .slice(0, 12)
    .map((group) => {
      const sorted = [...group].sort(
        (first, second) =>
          new Date(first.start_at).getTime() - new Date(second.start_at).getTime(),
      );
      const first = sorted[0];
      const courtNames = [...new Set(sorted.map((row) => getJoinedCourtName(row.courts)))];

      return {
        id: first.id,
        customerName: first.customer_name,
        customerAvatarUrl: first.customer_avatar_url,
        courtName: courtNames.join(" + "),
        startAt: first.start_at,
        endAt: sorted.reduce(
          (latest, row) =>
            new Date(row.end_at).getTime() > new Date(latest).getTime()
              ? row.end_at
              : latest,
          first.end_at,
        ),
        createdAt: first.created_at,
        paymentMethod: first.payment_method,
        downpaymentAmount: sorted.reduce(
          (sum, row) => sum + row.downpayment_amount,
          0,
        ),
        totalAmount: sorted.reduce((sum, row) => sum + row.total_amount, 0),
        slotCount: sorted.length,
      };
    });

  return NextResponse.json(
    { notifications },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
