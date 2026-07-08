import { redirect } from "next/navigation";
import { ADMIN_BOOKINGS_PAGE_SIZE } from "@/data/admin/adminPagination";
import type {
  AdminBooking,
  AdminBookingsPayload,
} from "@/types/admin/adminBooking";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getAdminBookingsPage(
  pageParam?: string | string[],
): Promise<AdminBookingsPayload> {
  const resolvedPageParam = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const currentPage = Math.max(1, Number(resolvedPageParam || 1) || 1);
  const from = (currentPage - 1) * ADMIN_BOOKINGS_PAGE_SIZE;
  const to = from + ADMIN_BOOKINGS_PAGE_SIZE - 1;

  const admin = createAdminClient();
  const { count, data: bookings } = await admin
    .from("bookings")
    .select(
      "id,user_email,customer_name,customer_contact,start_at,end_at,hourly_rate,total_amount,downpayment_amount,payment_method,payment_reference,payment_proof_url,status,courts(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_BOOKINGS_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  return {
    bookingRows: (bookings || []) as AdminBooking[],
    safePage,
    totalCount,
    totalPages,
  };
}

export async function getAdminBookings(pageParam?: string | string[]) {
  const result = await getAdminBookingsPage(pageParam);
  const resolvedPageParam = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const currentPage = Math.max(1, Number(resolvedPageParam || 1) || 1);

  if (result.totalCount > 0 && currentPage > result.totalPages) {
    redirect(`/admin?page=${result.totalPages}`);
  }

  return result;
}
