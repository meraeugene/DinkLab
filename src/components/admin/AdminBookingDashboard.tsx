"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import useSWR, { useSWRConfig } from "swr";
import {
  ArrowLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Plus,
  ReceiptText,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMIN_BOOKINGS_PAGE_SIZE } from "@/data/admin/adminPagination";
import { formatPeso } from "@/lib/pricing";
import {
  formatManilaDateTime,
  formatSlotLabel,
  getOperatingHours,
} from "@/lib/time";
import type {
  BookingSettings,
  CourtOption,
  PricingBand,
} from "@/types/bookingSettings";
import type {
  AdminBooking,
  AdminBookingFilters,
  AdminBookingsPayload,
  AdminScheduleBooking,
} from "@/types/admin/adminBooking";
import { formatPaymentMethod } from "@/utils/admin/formatPaymentMethod";
import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";
import { todayInManila } from "@/lib/time";
import { resetBookingData } from "@/actions/admin/resetBookingData";
import {
  type BusinessRuleFieldErrors,
  updateCourts,
  updateOperatingHours,
  updatePricingBands,
} from "@/actions/admin/updateBusinessRules";
import { ACCEPTED_BOOKINGS_KEY } from "@/hooks/useAcceptedBookings";
import { USER_BOOKING_HISTORY_KEY } from "@/hooks/useUserBookingHistory";
import { AdminBookingActions } from "./AdminBookingActions";
import { InfoBox } from "./InfoBox";
import { Pagination } from "./Pagination";
import { StatusBadge } from "./StatusBadge";

type AdminBookingDashboardProps = {
  bookingRows: AdminBooking[];
  courts: CourtOption[];
  currentPage: number;
  filters: AdminBookingFilters;
  pricingBands: PricingBand[];
  settings: BookingSettings;
  totalCount: number;
  totalPages: number;
};

type AdminView = "queue" | "schedule" | "settings" | "reset";

type SchedulePayload = {
  bookings: AdminScheduleBooking[];
};

type SaveSettingsResult =
  | {
      ok: boolean;
      error?: string;
      fieldErrors?: BusinessRuleFieldErrors;
      courts?: CourtOption[];
    }
  | undefined;

type BusinessSettingsSection = "courts" | "hours" | "pricing";

type ResetBookingDataResult =
  | {
      ok: boolean;
      error?: string;
      deletedCount: number;
    }
  | undefined;

export function AdminBookingDashboard({
  bookingRows,
  courts,
  currentPage,
  filters,
  pricingBands,
  settings,
  totalCount,
  totalPages,
}: AdminBookingDashboardProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [view, setView] = useState<AdminView>("queue");
  const [isFilterPending, startFilterTransition] = useTransition();
  const [notification, setNotification] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(todayInManila());
  const previousTotalCount = useRef(totalCount);
  const adminBookingsKey = buildAdminBookingsKey(filters);
  const fallbackData: AdminBookingsPayload = {
    bookingRows,
    filters,
    safePage: currentPage,
    totalCount,
    totalPages,
  };
  const { data, isValidating } = useSWR<AdminBookingsPayload>(
    adminBookingsKey,
    fetchAdminBookings,
    {
      fallbackData,
      revalidateOnFocus: true,
      refreshInterval: 10000,
    },
  );
  const scheduleKey = `/api/admin/schedule?date=${scheduleDate}`;
  const { data: scheduleData } = useSWR<SchedulePayload>(
    view === "schedule" ? scheduleKey : null,
    fetchSchedule,
    { revalidateOnFocus: true, refreshInterval: 10000 },
  );
  const activeData = data || fallbackData;
  const activeBookingRows = activeData.bookingRows;
  const reservedConflictIds = getReservedConflictIds(activeBookingRows);
  const activeCurrentPage = activeData.safePage;
  const activeTotalCount = activeData.totalCount;
  const activeTotalPages = activeData.totalPages;
  const queryString = filtersToQuery(filters, activeCurrentPage);
  const isQueueLoading = isFilterPending || (isValidating && !data);

  useEffect(() => {
    if (activeTotalCount > previousTotalCount.current) {
      setNotification("New booking submitted.");
    }
    previousTotalCount.current = activeTotalCount;
  }, [activeTotalCount]);

  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(() => setNotification(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  const firstVisible = activeTotalCount
    ? (activeCurrentPage - 1) * ADMIN_BOOKINGS_PAGE_SIZE + 1
    : 0;
  const lastVisible = Math.min(
    activeCurrentPage * ADMIN_BOOKINGS_PAGE_SIZE,
    activeTotalCount,
  );

  const pushFilters = useCallback(
    (nextFilters: AdminBookingFilters) => {
      const next = new URLSearchParams();
      for (const [key, item] of Object.entries(nextFilters)) {
        if (key === "page") continue;
        if (item) next.set(key, String(item));
      }
      startFilterTransition(() => {
        router.push(`/admin${next.toString() ? `?${next.toString()}` : ""}`);
      });
    },
    [router],
  );

  const updateFilter = useCallback(
    (name: keyof AdminBookingFilters, value: string) => {
      pushFilters({ ...filters, [name]: value, page: 1 });
    },
    [filters, pushFilters],
  );

  async function refreshAdminData() {
    await Promise.all([
      mutate(adminBookingsKey),
      mutate(scheduleKey),
      mutate("/api/admin/notifications"),
    ]);
  }

  async function saveCourts(formData: FormData) {
    const result = await updateCourts(formData);
    await refreshAdminData();
    if (result?.ok) router.refresh();
    return result;
  }

  async function saveHours(formData: FormData) {
    const result = await updateOperatingHours(formData);
    await refreshAdminData();
    if (result?.ok) router.refresh();
    return result;
  }

  async function savePricing(formData: FormData) {
    const result = await updatePricingBands(formData);
    await refreshAdminData();
    if (result?.ok) router.refresh();
    return result;
  }

  async function resetBookings(formData: FormData) {
    const result = await resetBookingData(formData);

    if (result?.ok) {
      await Promise.all([
        mutate(adminBookingsKey),
        mutate("/api/admin/bookings?page=1"),
        mutate(scheduleKey),
        mutate("/api/admin/notifications"),
        mutate(ACCEPTED_BOOKINGS_KEY),
        mutate(USER_BOOKING_HISTORY_KEY),
      ]);
      setNotification(`Reset complete. Deleted ${result.deletedCount} bookings.`);
      router.push("/admin");
      router.refresh();
    }

    return result;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-4 py-6 text-white sm:px-5 sm:py-8 lg:px-6 lg:py-10">
      {notification ? (
        <div className="fixed right-4 top-4 z-50 flex max-w-xs items-center gap-3 rounded-xl border border-lime-300/25 bg-zinc-950 px-4 py-3 text-sm text-lime-100 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
          <Bell className="h-4 w-4 shrink-0 text-lime-200" />
          <span>{notification}</span>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl">
        <div className="flex min-w-0 flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Dink Lab
            </p>
            <h1 className="mt-2 font-display text-2xl font-black sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Review submissions, inspect the court schedule, and manage booking
              rules.
            </p>
          </div>
          <Link
            className="premium-button h-12 w-full cursor-pointer rounded-xl px-5 font-display text-xs font-black uppercase tracking-[0.2em] sm:w-auto lg:h-10 lg:min-h-10 lg:px-4 lg:text-[0.65rem]"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Site
          </Link>
        </div>

        <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <div className="flex w-max min-w-full gap-2">
            <TabButton
              active={view === "queue"}
              onClick={() => setView("queue")}
            >
              Review Queue
            </TabButton>
            <TabButton
              active={view === "schedule"}
              onClick={() => setView("schedule")}
            >
              Court Schedule
            </TabButton>
            <TabButton
              active={view === "settings"}
              onClick={() => setView("settings")}
            >
              Business Settings
            </TabButton>
            <TabButton
              active={view === "reset"}
              onClick={() => setView("reset")}
            >
              Reset Data
            </TabButton>
          </div>
        </div>

        {view === "queue" ? (
          <section className="mt-8">
            <AdminFilters
              courts={courts}
              key={filtersToQuery(filters, filters.page)}
              filters={filters}
              onChange={updateFilter}
              onClear={() =>
                pushFilters({
                  courtId: "",
                  date: "",
                  page: 1,
                  paymentMethod: "",
                  q: "",
                  status: "",
                })
              }
            />
            <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                  Review Queue
                </p>
                <h2 className="mt-2 truncate font-display text-lg font-black">
                  Booking submissions
                </h2>
              </div>
              <p className="w-fit shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-500">
                {activeTotalCount} total
                {activeTotalCount > 0 ? (
                  <span className="ml-1 text-zinc-600">
                    ({firstVisible}-{lastVisible})
                  </span>
                ) : null}
              </p>
            </div>

            {isQueueLoading ? (
              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                <BookingCardSkeleton />
                <BookingCardSkeleton />
              </div>
            ) : activeBookingRows.length ? (
              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {activeBookingRows.map((booking) => (
                  <BookingCard
                    adminBookingsKey={adminBookingsKey}
                    booking={booking}
                    currentPage={activeCurrentPage}
                    hasReservedConflict={reservedConflictIds.has(booking.id)}
                    key={booking.id}
                    onRefresh={refreshAdminData}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-10 text-center text-sm text-zinc-500">
                No booking submissions match these filters.
              </p>
            )}

            {!isQueueLoading && activeTotalPages > 1 ? (
              <Pagination
                currentPage={activeCurrentPage}
                queryString={queryString}
                totalPages={activeTotalPages}
              />
            ) : null}
          </section>
        ) : null}

        {view === "schedule" ? (
          <ScheduleView
            bookings={scheduleData?.bookings || []}
            courts={courts}
            date={scheduleDate}
            settings={settings}
            onDateChange={setScheduleDate}
          />
        ) : null}

        {view === "settings" ? (
          <BusinessSettingsForm
            courts={courts}
            onSaveCourts={saveCourts}
            onSaveHours={saveHours}
            onSavePricing={savePricing}
            pricingBands={pricingBands}
            settings={settings}
          />
        ) : null}

        {view === "reset" ? (
          <ResetDataPanel
            bookingCount={activeTotalCount}
            onReset={resetBookings}
          />
        ) : null}
      </div>
    </main>
  );
}

function AdminFilters({
  courts,
  filters,
  onClear,
  onChange,
}: {
  courts: CourtOption[];
  filters: AdminBookingFilters;
  onClear: () => void;
  onChange: (name: keyof AdminBookingFilters, value: string) => void;
}) {
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    if (draftFilters.q === filters.q) return;
    const timeout = window.setTimeout(() => {
      onChange("q", draftFilters.q);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draftFilters.q, filters.q, onChange]);

  function updateImmediate(name: keyof AdminBookingFilters, value: string) {
    const next = { ...draftFilters, [name]: value, page: 1 };
    setDraftFilters(next);
    onChange(name, value);
  }

  function clearFilters() {
    setDraftFilters({
      courtId: "",
      date: "",
      page: 1,
      paymentMethod: "",
      q: "",
      status: "",
    });
    onClear();
  }

  return (
    <div className="relative grid gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-5">
      <input
        className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none transition hover:bg-white/[0.04] focus:border-white/35 sm:col-span-2 lg:col-span-2"
        placeholder="Search name, email, contact, ref"
        value={draftFilters.q}
        onChange={(event) =>
          setDraftFilters((current) => ({
            ...current,
            page: 1,
            q: event.target.value,
          }))
        }
      />
      <select
        className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white transition focus:border-white/35"
        value={draftFilters.status}
        onChange={(event) => updateImmediate("status", event.target.value)}
      >
        <option value="">All statuses</option>
        <option value="PENDING_REVIEW">Pending</option>
        <option value="ACCEPTED">Accepted</option>
        <option value="REJECTED">Rejected</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <select
        className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white transition focus:border-white/35"
        value={draftFilters.courtId}
        onChange={(event) => updateImmediate("courtId", event.target.value)}
      >
        <option value="">All courts</option>
        {courts.map((court) => (
          <option key={court.id} value={court.id}>
            {court.name}
          </option>
        ))}
      </select>
      <input
        className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white transition hover:bg-white/[0.04] focus:border-white/35"
        type="date"
        value={draftFilters.date}
        onChange={(event) => updateImmediate("date", event.target.value)}
      />
      <select
        className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white transition focus:border-white/35 lg:col-span-2"
        value={draftFilters.paymentMethod}
        onChange={(event) =>
          updateImmediate("paymentMethod", event.target.value)
        }
      >
        <option value="">All payment methods</option>
        <option value="BPI">BPI</option>
        <option value="GOTYME">GoTyme</option>
        <option value="ONSITE">Onsite</option>
      </select>
      <button
        className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
        type="button"
        onClick={clearFilters}
      >
        Clear Filters
      </button>
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
      <div className="animate-pulse">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-36 rounded bg-white/[0.08]" />
              <div className="h-7 w-24 rounded-full bg-white/[0.06]" />
            </div>
            <div className="mt-3 h-3 w-52 max-w-full rounded bg-white/[0.06]" />
            <div className="mt-2 h-3 w-32 rounded bg-white/[0.06]" />
          </div>
          <div className="h-20 w-full rounded-lg border border-white/10 bg-white/[0.04] sm:w-28" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
              key={index}
            >
              <div className="h-3 w-16 rounded bg-white/[0.06]" />
              <div className="mt-3 h-4 w-28 rounded bg-white/[0.08]" />
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 rounded-xl border border-white/10 bg-black/35 p-3 sm:grid-cols-[1fr_10rem]">
          <div>
            <div className="h-3 w-36 rounded bg-white/[0.06]" />
            <div className="mt-3 h-4 w-44 max-w-full rounded bg-white/[0.08]" />
          </div>
          <div className="h-24 rounded-lg border border-white/10 bg-white/[0.04]" />
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="h-14 rounded-lg border border-white/10 bg-white/[0.04]" />
        </div>
      </div>
    </article>
  );
}

function BookingCard({
  adminBookingsKey,
  booking,
  currentPage,
  hasReservedConflict,
  onRefresh,
}: {
  adminBookingsKey: string;
  booking: AdminBooking;
  currentPage: number;
  hasReservedConflict: boolean;
  onRefresh: () => Promise<void>;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <h3 className="truncate text-base font-bold text-white">
              {booking.customer_name}
            </h3>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-500">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{booking.user_email}</span>
          </p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-zinc-300">
            <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="truncate">{booking.customer_contact}</span>
          </p>
        </div>
        <div className="grid w-full shrink-0 grid-cols-2 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left sm:block sm:w-auto sm:min-w-28 sm:text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Pay
          </p>
          <p className="text-right text-lg font-black text-white sm:text-inherit">
            {formatPeso(booking.downpayment_amount)}
          </p>
          <p className="col-span-2 text-xs text-zinc-500">
            of {formatPeso(booking.total_amount)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <InfoBox label="Court" value={getJoinedCourtName(booking.courts)} />
        <InfoBox
          label="Method"
          value={formatPaymentMethod(booking.payment_method)}
        />
        <InfoBox
          label="Starts"
          value={formatManilaDateTime(booking.start_at)}
        />
        <InfoBox label="Ends" value={formatManilaDateTime(booking.end_at)} />
      </div>

      <div className="mt-3 grid gap-3 rounded-xl border border-white/10 bg-black/35 p-3 sm:grid-cols-[1fr_10rem] sm:items-stretch">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            <ReceiptText className="h-4 w-4" />
            <span className="truncate">Payment proof</span>
          </div>
          <p className="mt-2 truncate text-sm text-zinc-300">
            Ref: {booking.payment_reference || "No reference"}
          </p>
        </div>
        {booking.payment_proof_url ? (
          <Link
            className="block min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
            href={booking.payment_proof_url}
            target="_blank"
          >
            <span
              aria-hidden="true"
              className="block aspect-[16/10] bg-cover bg-center sm:aspect-auto sm:h-full"
              style={{ backgroundImage: `url(${booking.payment_proof_url})` }}
            />
            <span className="flex min-w-0 items-center justify-center gap-2 border-t border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300">
              <span className="truncate">Preview proof</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </span>
          </Link>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-zinc-500 sm:grid sm:place-items-center">
            No uploaded proof
          </p>
        )}
      </div>

      {/* {booking.review_reason ? (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-zinc-400">
          {booking.review_reason}
        </p>
      ) : null} */}

      <div className="mt-3 border-t border-white/10 pt-3">
        <AdminBookingActions
          adminBookingsKey={adminBookingsKey}
          bookingId={booking.id}
          currentPage={currentPage}
          hasReservedConflict={hasReservedConflict}
          status={booking.status}
          onRefresh={onRefresh}
        />
      </div>
    </article>
  );
}

function ResetDataPanel({
  bookingCount,
  onReset,
}: {
  bookingCount: number;
  onReset: (formData: FormData) => Promise<ResetBookingDataResult>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">(
    "success",
  );
  const canReset = confirmation === "RESET BOOKINGS";

  async function handleReset(formData: FormData) {
    setMessage(null);
    const result = await onReset(formData);

    if (result?.ok) {
      setConfirmation("");
      setMessageTone("success");
      setMessage(`Reset complete. Deleted ${result.deletedCount} bookings.`);
      return;
    }

    setMessageTone("error");
    setMessage(result?.error || "Unable to reset booking data.");
  }

  return (
    <section className="mt-8 rounded-2xl border border-red-300/25 bg-red-400/[0.035] p-4 sm:p-5">
      <div className="max-w-3xl">
        <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-red-200/80">
          Reset Data
        </p>
        <h2 className="mt-2 font-display text-xl font-black text-white">
          Clear booking records
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This permanently deletes all booking submissions, customer booking
          history, admin review queue rows, and accepted schedule slots. Courts,
          pricing, operating hours, and admin access will stay unchanged.
        </p>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-black/35 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Current bookings
          </p>
          <p className="mt-1 text-2xl font-black text-white">{bookingCount}</p>
        </div>
        <p className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-100">
          This cannot be undone.
        </p>
      </div>

      <form action={handleReset} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Type RESET BOOKINGS to confirm
          <input
            className="h-12 w-full rounded-xl border border-white/10 bg-black px-3 text-white outline-none transition hover:bg-white/[0.04] focus:border-white/35"
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        {message ? (
          <p
            className={[
              "rounded-xl border px-4 py-3 text-sm font-semibold",
              messageTone === "success"
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                : "border-red-400/30 bg-red-400/10 text-red-100",
            ].join(" ")}
          >
            {message}
          </p>
        ) : null}
        <ResetSubmitButton enabled={canReset} />
      </form>
    </section>
  );
}

function ResetSubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || !enabled;

  return (
    <div className="flex justify-end">
      <button
        className={[
          "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border px-5 font-display text-xs font-black uppercase tracking-[0.2em] transition sm:w-auto",
          disabled
            ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600"
            : "cursor-pointer border-red-300/35 bg-red-400/10 text-red-100 hover:border-red-300/60 hover:bg-red-400/20",
        ].join(" ")}
        disabled={disabled}
        type="submit"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Resetting..." : "Reset Bookings"}
      </button>
    </div>
  );
}

function ScheduleView({
  bookings,
  courts,
  date,
  settings,
  onDateChange,
}: {
  bookings: AdminScheduleBooking[];
  courts: CourtOption[];
  date: string;
  settings: BookingSettings;
  onDateChange: (date: string) => void;
}) {
  const hours = useMemo(
    () => getOperatingHours(settings.openHour, settings.closeHour),
    [settings.closeHour, settings.openHour],
  );

  function moveDate(days: number) {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    onDateChange(next.toISOString().slice(0, 10));
  }

  return (
    <section className="mt-8">
      <div className="flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
            Court Schedule
          </p>
          <h2 className="mt-2 font-display text-lg font-black">
            Accepted bookings by court
          </h2>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            aria-label="Previous day"
            className="grid min-h-10 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-300 transition hover:border-white/30 hover:bg-white/[0.09] hover:text-white sm:w-11"
            type="button"
            onClick={() => moveDate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            className="order-first col-span-2 min-h-10 cursor-pointer rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white transition hover:bg-white/[0.04] focus:border-white/35 sm:order-none"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
          <button
            aria-label="Next day"
            className="grid min-h-10 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-300 transition hover:border-white/30 hover:bg-white/[0.09] hover:text-white sm:w-11"
            type="button"
            onClick={() => moveDate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {courts.map((court) => (
          <div
            className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 p-3 sm:p-4"
            key={court.id}
          >
            <h3 className="truncate font-display text-base font-black uppercase tracking-widest sm:text-lg">
              {court.name}
            </h3>
            <div className="mt-4 grid gap-2">
              {hours.map((hour) => {
                const slotBooking = bookings.find((booking) => {
                  const start = new Date(booking.startAt);
                  const manilaHour = Number(
                    new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      hour12: false,
                      timeZone: "Asia/Manila",
                    }).format(start),
                  );
                  const normalizedHour =
                    manilaHour < settings.openHour
                      ? manilaHour + 24
                      : manilaHour;
                  return (
                    booking.courtId === court.id && normalizedHour === hour
                  );
                });

                return (
                  <div
                    className={[
                      "grid min-w-0 gap-2 rounded-xl border px-3 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]",
                      slotBooking
                        ? "border-lime-300/25 bg-lime-300/[0.08]"
                        : "border-white/10 bg-black/35",
                    ].join(" ")}
                    key={hour}
                  >
                    <p className="font-display text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                      {formatSlotLabel(hour)}
                    </p>
                    {slotBooking ? (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {slotBooking.customerName}
                        </p>
                        <p className="mt-1 break-words text-xs text-zinc-400">
                          {slotBooking.customerContact} /{" "}
                          {formatPaymentMethod(slotBooking.paymentMethod)} /{" "}
                          {formatPeso(slotBooking.totalAmount)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-600">Empty slot</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BusinessSettingsForm({
  courts,
  onSaveCourts,
  onSaveHours,
  onSavePricing,
  pricingBands,
  settings,
}: {
  courts: CourtOption[];
  onSaveCourts: (formData: FormData) => Promise<SaveSettingsResult>;
  onSaveHours: (formData: FormData) => Promise<SaveSettingsResult>;
  onSavePricing: (formData: FormData) => Promise<SaveSettingsResult>;
  pricingBands: PricingBand[];
  settings: BookingSettings;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">(
    "success",
  );
  const [sectionErrors, setSectionErrors] = useState<
    Record<BusinessSettingsSection, BusinessRuleFieldErrors>
  >({
    courts: {},
    hours: {},
    pricing: {},
  });
  const [courtRows, setCourtRows] = useState(
    courts.map((court) => ({
      id: court.id,
      name: court.name,
      description: normalizeCourtType(court.description),
    })),
  );
  const [deletedCourtIds, setDeletedCourtIds] = useState<string[]>([]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function handleSectionSave(
    section: BusinessSettingsSection,
    action: (formData: FormData) => Promise<SaveSettingsResult>,
    successMessage: string,
    formData: FormData,
  ) {
    setMessage(null);
    const result = await action(formData);

    if (result?.ok) {
      setSectionErrors((current) => ({ ...current, [section]: {} }));
      if (section === "courts") {
        setDeletedCourtIds([]);
        if (result.courts) {
          setCourtRows(
            result.courts.map((court) => ({
              id: court.id,
              name: court.name,
              description: normalizeCourtType(court.description),
            })),
          );
        }
      }
      setMessageTone("success");
      setMessage(successMessage);
      return;
    }

    setSectionErrors((current) => ({
      ...current,
      [section]: result?.fieldErrors || {},
    }));
    setMessageTone("error");
    setMessage(
      result?.error || "Unable to save settings. Check the highlighted fields.",
    );
  }

  const courtErrors = sectionErrors.courts;
  const hourErrors = sectionErrors.hours;
  const pricingErrors = sectionErrors.pricing;

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-950 p-3 sm:p-4">
      {message ? (
        <AdminToast
          message={message}
          tone={messageTone}
          onClose={() => setMessage(null)}
        />
      ) : null}
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-zinc-500" />
        <div>
          <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
            Business Settings
          </p>
          <h2 className="mt-1 font-display text-lg font-black">
            Pricing and operating hours
          </h2>
        </div>
      </div>
      {message && messageTone === "error" ? (
        <div className="mt-4 rounded-xl border border-red-400/35 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100">
          {message}
        </div>
      ) : null}
      <div className="mt-5 grid gap-5">
        <form
          action={(formData) =>
            handleSectionSave(
              "courts",
              onSaveCourts,
              "Court details saved.",
              formData,
            )
          }
        >
          <SettingsCard
            eyebrow="Courts"
            title="Court details"
            description="Edit existing courts or add a new court for booking, filters, and schedule."
            hasError={Boolean(courtErrors.courts)}
            error={
              courtErrors.courts ||
              (Object.keys(courtErrors).some((key) => key.startsWith("court-"))
                ? "Check the highlighted court name or type."
                : undefined)
            }
          >
            {deletedCourtIds.map((id) => (
              <input key={id} name="deletedCourtId" type="hidden" value={id} />
            ))}
            <div className="grid gap-3 lg:grid-cols-2">
              {courtRows.map((court, index) => (
                <div
                  className="grid gap-3 rounded-xl border border-white/10 bg-black/35 p-3"
                  key={court.id || `new-court-${index}`}
                >
                  <input name="courtId" type="hidden" value={court.id} />
                  <label className="grid gap-2 text-sm font-semibold text-zinc-300">
                    Court name
                    <input
                      className={settingsInputClass(
                        Boolean(courtErrors[`court-${index}-name`]),
                        "rounded-lg h-11",
                      )}
                      name="courtName"
                      placeholder={`Court ${index + 1}`}
                      value={court.name}
                      onChange={(event) =>
                        setCourtRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    {courtErrors[`court-${index}-name`] ? (
                      <span className="text-xs text-red-300">
                        {courtErrors[`court-${index}-name`]}
                      </span>
                    ) : null}
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-zinc-300">
                    Court type
                    <select
                      className={settingsSelectClass(
                        Boolean(courtErrors[`court-${index}-description`]),
                        "rounded-lg h-11",
                      )}
                      name="courtType"
                      value={court.description}
                      onChange={(event) =>
                        setCourtRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, description: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="Indoor">Indoor</option>
                      <option value="Outdoor">Outdoor</option>
                    </select>
                    {courtErrors[`court-${index}-description`] ? (
                      <span className="text-xs text-red-300">
                        {courtErrors[`court-${index}-description`]}
                      </span>
                    ) : null}
                  </label>
                  <button
                    className={[
                      "inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold uppercase tracking-[0.14em] transition sm:w-fit",
                      courtRows.length <= 1
                        ? "cursor-not-allowed border-white/5 text-zinc-700"
                        : "border-red-300/20 bg-red-400/[0.04] text-red-100 hover:border-red-300/45 hover:bg-red-400/12",
                    ].join(" ")}
                    disabled={courtRows.length <= 1}
                    type="button"
                    onClick={() => {
                      if (courtRows.length <= 1) return;
                      if (court.id) {
                        setDeletedCourtIds((current) =>
                          current.includes(court.id)
                            ? current
                            : [...current, court.id],
                        );
                      }
                      setCourtRows((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      );
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Court
                  </button>
                </div>
              ))}
            </div>
            <button
              className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.09] hover:text-white sm:w-auto"
              type="button"
              onClick={() =>
                setCourtRows((current) => [
                  ...current,
                  {
                    id: "",
                    name: `Court ${current.length + 1}`,
                    description: "Indoor",
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Add Court
            </button>
            <SectionSubmitButton
              label="Save Courts"
              loadingLabel="Saving Courts..."
            />
          </SettingsCard>
        </form>

        <form
          action={(formData) =>
            handleSectionSave(
              "hours",
              onSaveHours,
              "Operating hours saved.",
              formData,
            )
          }
        >
          <SettingsCard
            eyebrow="Hours"
            title="Operating hours"
            description="Use familiar time labels here. The system still stores precise hour values for scheduling."
            hasError={Boolean(hourErrors.openHour || hourErrors.closeHour)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TimeSelect
                error={hourErrors.openHour}
                label="Opens"
                name="openHour"
                value={settings.openHour}
              />
              <TimeSelect
                error={hourErrors.closeHour}
                label="Closes"
                name="closeHour"
                value={settings.closeHour}
              />
            </div>
            <SectionSubmitButton
              label="Save Hours"
              loadingLabel="Saving Hours..."
            />
          </SettingsCard>
        </form>

        <form
          action={(formData) =>
            handleSectionSave(
              "pricing",
              onSavePricing,
              "Pricing saved.",
              formData,
            )
          }
        >
          <SettingsCard
            eyebrow="Pricing"
            title="Price bands"
            description="Each band should touch the next one. No gaps, no overlaps."
            hasError={Boolean(pricingErrors.pricingBands)}
            error={pricingErrors.pricingBands}
          >
            <div className="grid gap-3">
              {pricingBands.map((band, index) => (
                <div
                  className="grid gap-3 rounded-xl border border-white/10 bg-black/35 p-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr]"
                  key={band.id}
                >
                  <label className="grid gap-2 text-sm font-semibold text-zinc-300">
                    Label
                    <input
                      className={settingsInputClass(
                        Boolean(pricingErrors[`band-${index}-label`]),
                        "rounded-lg h-11",
                      )}
                      defaultValue={band.label}
                      name="label"
                    />
                    {pricingErrors[`band-${index}-label`] ? (
                      <span className="text-xs text-red-300">
                        {pricingErrors[`band-${index}-label`]}
                      </span>
                    ) : null}
                  </label>
                  <TimeSelect
                    error={pricingErrors[`band-${index}-startHour`]}
                    label="Starts"
                    name="startHour"
                    value={band.startHour}
                  />
                  <TimeSelect
                    error={pricingErrors[`band-${index}-endHour`]}
                    label="Ends"
                    name="endHour"
                    value={band.endHour}
                  />
                  <label className="grid gap-2 text-sm font-semibold text-zinc-300">
                    Rate
                    <span className="relative block">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-500">
                        PHP
                      </span>
                      <input
                        className={[
                          settingsInputClass(
                            Boolean(pricingErrors[`band-${index}-hourlyRate`]),
                            "rounded-lg h-11",
                          ),
                          "pl-12",
                        ].join(" ")}
                        defaultValue={band.hourlyRate}
                        name="hourlyRate"
                        type="number"
                      />
                    </span>
                    {pricingErrors[`band-${index}-hourlyRate`] ? (
                      <span className="text-xs text-red-300">
                        {pricingErrors[`band-${index}-hourlyRate`]}
                      </span>
                    ) : null}
                  </label>
                </div>
              ))}
            </div>
            <SectionSubmitButton
              label="Save Pricing"
              loadingLabel="Saving Pricing..."
            />
          </SettingsCard>
        </form>
        {/* {message && messageTone === "success" ? (
          <p className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
            {message}
          </p>
        ) : null} */}
      </div>
    </section>
  );
}

function SettingsCard({
  children,
  description,
  error,
  eyebrow,
  hasError,
  title,
}: {
  children: ReactNode;
  description: string;
  error?: string;
  eyebrow: string;
  hasError?: boolean;
  title: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border p-4",
        hasError
          ? "border-red-400/45 bg-red-400/[0.04]"
          : "border-white/10 bg-black/25",
      ].join(" ")}
    >
      <div className="mb-4">
        <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
          {eyebrow}
        </p>
        <h3 className="mt-1 font-display text-lg font-black text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
        {error ? (
          <p className="mt-3 rounded-xl border border-red-400/35 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-100">
            {error}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SectionSubmitButton({
  label,
  loadingLabel,
}: {
  label: string;
  loadingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-4 flex justify-end">
      <button
        className={[
          "premium-button h-12 w-full rounded-xl px-5 font-display text-xs font-black uppercase tracking-[0.2em] sm:w-auto",
          pending ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        ].join(" ")}
        disabled={pending}
        type="submit"
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {pending ? loadingLabel : label}
        </span>
      </button>
    </div>
  );
}

function TimeSelect({
  error,
  label,
  name,
  value,
}: {
  error?: string;
  label: string;
  name: string;
  value: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-zinc-300">
      {label}
      <select
        className={[
          "h-11 w-full min-w-0 cursor-pointer rounded-lg border bg-black px-3 text-white outline-none transition",
          error
            ? "border-red-400/70 focus:border-red-300 focus:ring-2 focus:ring-red-400/20"
            : "border-white/10 focus:border-white/35",
        ].join(" ")}
        defaultValue={value}
        name={name}
      >
        {buildTimeOptions().map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
}

function settingsInputClass(hasError: boolean, size = "rounded-xl h-12") {
  return [
    size,
    "w-full min-w-0 border bg-black px-3 text-white outline-none transition hover:bg-white/[0.04]",
    hasError
      ? "border-red-400/70 focus:border-red-300 focus:ring-2 focus:ring-red-400/20"
      : "border-white/10 focus:border-white/35",
  ].join(" ");
}

function settingsSelectClass(hasError: boolean, size = "rounded-xl h-12") {
  return [
    size,
    "w-full min-w-0 cursor-pointer border bg-black px-3 text-white outline-none transition",
    hasError
      ? "border-red-400/70 focus:border-red-300 focus:ring-2 focus:ring-red-400/20"
      : "border-white/10 focus:border-white/35",
  ].join(" ");
}

function normalizeCourtType(value: string | null) {
  return value?.toLowerCase().includes("outdoor") ? "Outdoor" : "Indoor";
}

function buildTimeOptions() {
  return Array.from({ length: 30 }, (_, hour) => ({
    value: hour,
    label: formatAdminTime(hour),
  }));
}

function formatAdminTime(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized < 12 ? "AM" : "PM";
  const twelveHour = normalized % 12 || 12;
  const nextDay = hour >= 24 ? " next day" : "";
  return `${twelveHour}:00 ${suffix}${nextDay}`;
}

function AdminToast({
  message,
  onClose,
  tone,
}: {
  message: string;
  onClose: () => void;
  tone: "error" | "success";
}) {
  return (
    <div
      className={[
        "fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:left-auto sm:right-5 sm:mx-0",
        tone === "success"
          ? "border-emerald-300/35 bg-emerald-300 text-black"
          : "border-red-300/35 bg-white text-black",
      ].join(" ")}
      role="status"
    >
      <span>{message}</span>
      <button
        aria-label="Close message"
        className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full border border-black/10 transition hover:bg-black/10"
        type="button"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition",
        active
          ? "border-lime-300/35 bg-lime-300/12 text-lime-100 hover:bg-lime-300/20"
          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:bg-white/[0.08] hover:text-white",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

async function fetchAdminBookings(url: string) {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to load admin bookings.");
  }

  return payload as AdminBookingsPayload;
}

async function fetchSchedule(url: string) {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to load admin schedule.");
  }

  return payload as SchedulePayload;
}

function buildAdminBookingsKey(filters: AdminBookingFilters) {
  return `/api/admin/bookings?${filtersToQuery(filters, filters.page)}`;
}

function filtersToQuery(filters: AdminBookingFilters, page: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  for (const [key, value] of Object.entries(filters)) {
    if (key === "page") continue;
    if (value) params.set(key, String(value));
  }
  return params.toString();
}

function getReservedConflictIds(bookings: AdminBooking[]) {
  const acceptedBookings = bookings.filter(
    (booking) => booking.status === "ACCEPTED",
  );
  const conflictIds = new Set<string>();

  for (const booking of bookings) {
    if (booking.status !== "PENDING_REVIEW") continue;

    const hasConflict = acceptedBookings.some(
      (acceptedBooking) =>
        getJoinedCourtName(acceptedBooking.courts) ===
          getJoinedCourtName(booking.courts) &&
        new Date(acceptedBooking.start_at).getTime() <
          new Date(booking.end_at).getTime() &&
        new Date(acceptedBooking.end_at).getTime() >
          new Date(booking.start_at).getTime(),
    );

    if (hasConflict) {
      conflictIds.add(booking.id);
    }
  }

  return conflictIds;
}
