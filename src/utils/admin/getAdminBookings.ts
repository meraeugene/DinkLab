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
import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";

export async function getAdminBookingsPage(
  params?: Partial<Record<keyof AdminBookingFilters, string | string[]>>,
): Promise<AdminBookingsPayload> {
  const filters = resolveAdminBookingFilters(params);
  const currentPage = Math.max(1, Number(filters.page || 1) || 1);
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id,booking_group_id,created_at,court_id,user_email,customer_name,customer_contact,start_at,end_at,hourly_rate,total_amount,downpayment_amount,payment_method,payment_reference,payment_proof_url,status,reviewed_at,reviewed_by_email,review_reason,courts(name)",
    )
    .order("created_at", { ascending: false })
    .range(0, 4999);

  const groupedBookings = groupAdminBookings((data || []) as AdminBooking[]);
  const filteredBookings = groupedBookings.filter((booking) => {
    if (filters.status && booking.status !== filters.status) return false;
    if (filters.paymentMethod && booking.payment_method !== filters.paymentMethod) {
      return false;
    }
    if (
      filters.courtId &&
      !booking.schedule?.some((slot) => slot.courtId === filters.courtId)
    ) {
      return false;
    }
    if (filters.date) {
      const start = manilaHourToUtc(filters.date, 0).getTime();
      const end = manilaHourToUtc(filters.date, 24).getTime();
      if (
        !booking.schedule?.some((slot) => {
          const slotStart = new Date(slot.startAt).getTime();
          return slotStart >= start && slotStart < end;
        })
      ) {
        return false;
      }
    }
    if (filters.q) {
      const query = filters.q.toLowerCase();
      const searchable = [
        booking.customer_name,
        booking.user_email || "",
        booking.customer_contact,
        booking.payment_reference || "",
      ].join(" ").toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  });

  const totalCount = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_BOOKINGS_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const from = (safePage - 1) * ADMIN_BOOKINGS_PAGE_SIZE;

  return {
    bookingRows: filteredBookings.slice(from, from + ADMIN_BOOKINGS_PAGE_SIZE),
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

function groupAdminBookings(rows: AdminBooking[]) {
  const groups = new Map<string, AdminBooking[]>();
  for (const row of rows) {
    const key = row.booking_group_id || row.id;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
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

    return {
      ...first,
      start_at: first.start_at,
      end_at: latestEnd,
      total_amount: sorted.reduce((sum, row) => sum + row.total_amount, 0),
      downpayment_amount: sorted.reduce(
        (sum, row) => sum + row.downpayment_amount,
        0,
      ),
      schedule: sorted.map((row) => ({
        id: row.id,
        courtId: row.court_id || "",
        courtName: getJoinedCourtName(row.courts),
        startAt: row.start_at,
        endAt: row.end_at,
        totalAmount: row.total_amount,
      })),
    } satisfies AdminBooking;
  });
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
    status: ["PENDING_REVIEW", "ACCEPTED", "CANCELLED", "REJECTED"].includes(status)
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
