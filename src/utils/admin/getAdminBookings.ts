import { redirect } from "next/navigation";
import { ADMIN_BOOKINGS_PAGE_SIZE } from "@/data/admin/adminPagination";
import { manilaHourToUtc } from "@/lib/time";
import type {
  AdminBooking,
  AdminBookingFilters,
  AdminBookingsPayload,
} from "@/types/admin/adminBooking";
import { createAdminClient } from "@/utils/supabase/admin";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";

export async function getAdminBookingsPage(
  params?: Partial<Record<keyof AdminBookingFilters, string | string[]>>,
): Promise<AdminBookingsPayload> {
  const filters = resolveAdminBookingFilters(params);
  const resolvedPageParam = String(filters.page);
  const currentPage = Math.max(1, Number(resolvedPageParam || 1) || 1);
  const from = (currentPage - 1) * ADMIN_BOOKINGS_PAGE_SIZE;
  const to = from + ADMIN_BOOKINGS_PAGE_SIZE - 1;

  const admin = createAdminClient();
  let query = admin
    .from("bookings")
    .select(
      "id,user_email,customer_name,customer_contact,start_at,end_at,hourly_rate,total_amount,downpayment_amount,payment_method,payment_reference,payment_proof_url,status,reviewed_at,reviewed_by_email,review_reason,courts(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.paymentMethod) {
    query = query.eq("payment_method", filters.paymentMethod);
  }
  if (filters.courtId) query = query.eq("court_id", filters.courtId);
  if (filters.date) {
    query = query
      .gte("start_at", manilaHourToUtc(filters.date, 0).toISOString())
      .lt("start_at", manilaHourToUtc(filters.date, 24).toISOString());
  }
  if (filters.q) {
    const escaped = filters.q.replace(/[%_]/g, "");
    query = query.or(
      `customer_name.ilike.%${escaped}%,user_email.ilike.%${escaped}%,customer_contact.ilike.%${escaped}%,payment_reference.ilike.%${escaped}%`,
    );
  }

  const { count, data: bookings } = await query.range(from, to);

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_BOOKINGS_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  return {
    bookingRows: (bookings || []) as AdminBooking[],
    safePage,
    totalCount,
    totalPages,
    filters: { ...filters, page: safePage },
  };
}

export async function getAdminBookings(
  params?: Partial<Record<keyof AdminBookingFilters, string | string[]>>,
) {
  const result = await getAdminBookingsPage(params);
  const pageParam = params?.page;
  const resolvedPageParam = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const currentPage = Math.max(1, Number(resolvedPageParam || 1) || 1);

  if (result.totalCount > 0 && currentPage > result.totalPages) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(result.filters)) {
      if (key === "page") continue;
      if (value) query.set(key, String(value));
    }
    query.set("page", String(result.totalPages));
    redirect(`/admin?${query.toString()}`);
  }

  return result;
}

export function resolveAdminBookingFilters(
  params?: Partial<Record<keyof AdminBookingFilters, string | string[]>>,
): AdminBookingFilters {
  const getValue = (key: keyof AdminBookingFilters) => {
    const value = params?.[key];
    return (Array.isArray(value) ? value[0] : value || "").trim();
  };
  const status = getValue("status");
  const paymentMethod = getValue("paymentMethod");
  const courtId = normalizeCourtId(getValue("courtId")) || "";

  return {
    page: Math.max(1, Number(getValue("page") || 1) || 1),
    status: ["PENDING_REVIEW", "ACCEPTED", "CANCELLED", "REJECTED"].includes(
      status,
    )
      ? status
      : "",
    courtId,
    paymentMethod: ["BPI", "GOTYME", "ONSITE"].includes(paymentMethod)
      ? paymentMethod
      : "",
    date: /^\d{4}-\d{2}-\d{2}$/.test(getValue("date"))
      ? getValue("date")
      : "",
    q: getValue("q").slice(0, 80),
  };
}
