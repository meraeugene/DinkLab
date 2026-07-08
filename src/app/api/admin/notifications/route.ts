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
      "id,customer_name,customer_avatar_url,start_at,end_at,created_at,payment_method,downpayment_amount,total_amount,courts(name)",
    )
    .eq("status", "PENDING_REVIEW")
    .order("created_at", { ascending: false })
    .limit(12);

  let rows = (withAvatar.data || []) as AdminNotificationRow[];
  let error = withAvatar.error;

  if (withAvatar.error && isMissingAvatarColumn(withAvatar.error)) {
    const fallback = await admin
      .from("bookings")
      .select(
        "id,customer_name,start_at,end_at,created_at,payment_method,downpayment_amount,total_amount,courts(name)",
      )
      .eq("status", "PENDING_REVIEW")
      .order("created_at", { ascending: false })
      .limit(12);

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

  const notifications: AdminBookingNotification[] = rows.map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    customerAvatarUrl: row.customer_avatar_url,
    courtName: getJoinedCourtName(row.courts),
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    paymentMethod: row.payment_method,
    downpaymentAmount: row.downpayment_amount,
    totalAmount: row.total_amount,
  }));

  return NextResponse.json(
    { notifications },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
