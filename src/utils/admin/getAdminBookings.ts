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

type AdminBookingGroupsRpcPayload = {
  bookingRows: AdminBooking[];
  totalCount: number;
};

export async function getAdminBookingsPage(
  params?: Partial<Record<keyof AdminBookingFilters, string | string[]>>,
): Promise<AdminBookingsPayload> {
  const filters = resolveAdminBookingFilters(params);
  const currentPage = Math.max(1, Number(filters.page || 1) || 1);
  const admin = createAdminClient();
  const initialPayload = await loadAdminBookingGroups(
    admin,
    filters,
    currentPage,
  );
  const totalCount = initialPayload.totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_BOOKINGS_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const payload =
    safePage === currentPage
      ? initialPayload
      : await loadAdminBookingGroups(admin, filters, safePage);

  return {
    bookingRows: payload.bookingRows,
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

async function loadAdminBookingGroups(
  admin: ReturnType<typeof createAdminClient>,
  filters: AdminBookingFilters,
  page: number,
): Promise<AdminBookingGroupsRpcPayload> {
  const dateStart = filters.date
    ? manilaHourToUtc(filters.date, 0).toISOString()
    : null;
  const dateEnd = filters.date
    ? manilaHourToUtc(filters.date, 24).toISOString()
    : null;
  const { data, error } = await admin.rpc("get_admin_booking_groups", {
    p_court_id: filters.courtId || null,
    p_date_end: dateEnd,
    p_date_start: dateStart,
    p_limit: ADMIN_BOOKINGS_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_BOOKINGS_PAGE_SIZE,
    p_payment_method: filters.paymentMethod || null,
    p_query: filters.q || null,
    p_status: filters.status || null,
  });

  if (error) {
    throw new Error("Unable to load admin bookings.", { cause: error });
  }
  if (!isAdminBookingGroupsRpcPayload(data)) {
    throw new Error("The admin booking response is incomplete.");
  }

  return data;
}

function isAdminBookingGroupsRpcPayload(
  value: unknown,
): value is AdminBookingGroupsRpcPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AdminBookingGroupsRpcPayload>;
  return Array.isArray(payload.bookingRows) && Number.isFinite(payload.totalCount);
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
