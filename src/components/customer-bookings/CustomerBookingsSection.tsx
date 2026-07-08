"use client";

import type React from "react";
import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Clock3, Loader2, ReceiptText, XCircle } from "lucide-react";
import { useSWRConfig } from "swr";
import { cancelUserBooking } from "@/actions/bookings/cancelUserBooking";
import { formatPeso } from "@/lib/pricing";
import type { UserBooking } from "@/types/userBooking";
import { formatAcceptedBookingDate } from "@/utils/booking/formatAcceptedBookingDate";
import { formatAcceptedBookingTime } from "@/utils/booking/formatAcceptedBookingTime";
import { formatPaymentMethod } from "@/utils/admin/formatPaymentMethod";
import {
  USER_BOOKING_HISTORY_KEY,
  useUserBookingHistory,
} from "@/hooks/useUserBookingHistory";
import { StatusBadge } from "@/components/admin/StatusBadge";

type CustomerBookingsSectionProps = {
  bookings: UserBooking[];
  signedIn: boolean;
};

const FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING_REVIEW" },
  { label: "Confirmed", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export function CustomerBookingsSection({
  bookings,
  signedIn,
}: CustomerBookingsSectionProps) {
  const { mutate } = useSWRConfig();
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(
    null,
  );
  const [isCancelling, startCancelTransition] = useTransition();
  const { data: bookingHistory = bookings } = useUserBookingHistory({
    enabled: signedIn,
    initialBookings: bookings,
  });
  const visibleBookings = useMemo(
    () =>
      filter === "ALL"
        ? bookingHistory
        : bookingHistory.filter((booking) => booking.status === filter),
    [bookingHistory, filter],
  );

  if (!signedIn || !bookingHistory.length) return null;

  function handleCancel(bookingId: string) {
    setCancelError(null);
    setCancellingBookingId(bookingId);
    const formData = new FormData();
    formData.append("bookingId", bookingId);

    startCancelTransition(async () => {
      const result = await cancelUserBooking(formData);
      await mutate(USER_BOOKING_HISTORY_KEY);
      setCancellingBookingId(null);

      if (!result?.ok) {
        setCancelError(result?.error || "Unable to cancel booking.");
      }
    });
  }

  return (
    <section className="relative court-section bg-black py-10">
      <div className="site-container">
        <div className="glass-panel silver-border rounded-2xl p-4 sm:p-5 lg:rounded-[2rem] lg:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-lime-200/70">
                My Bookings
              </p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">
                Booking History
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  className={[
                    "rounded-full border px-3 cursor-pointer py-1.5 text-xs font-bold transition",
                    filter === item.value
                      ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white",
                  ].join(" ")}
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {cancelError ? (
            <p className="mt-4 rounded-xl border border-red-400/30 px-4 py-3 text-sm font-semibold text-red-200">
              {cancelError}
            </p>
          ) : null}

          {visibleBookings.length ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {visibleBookings.map((booking) => (
                <article
                  className={[
                    "rounded-2xl border p-4",
                    booking.status === "ACCEPTED"
                      ? "border-lime-300/20"
                      : "border-white/10 bg-black/35",
                  ].join(" ")}
                  key={booking.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="truncate font-display font-black uppercase tracking-widest text-white">
                      {booking.courtName}
                    </h3>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <BookingDetail
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Date"
                      value={formatAcceptedBookingDate(booking.startAt)}
                    />
                    <BookingDetail
                      icon={<Clock3 className="h-4 w-4" />}
                      label="Time"
                      value={`${formatAcceptedBookingTime(
                        booking.startAt,
                      )} - ${formatAcceptedBookingTime(booking.endAt)}`}
                    />
                    <BookingDetail
                      icon={<ReceiptText className="h-4 w-4" />}
                      label="Payment"
                      value={`${formatPaymentMethod(
                        booking.paymentMethod,
                      )} ${formatPeso(booking.downpaymentAmount)} / ${formatPeso(
                        booking.totalAmount,
                      )}`}
                    />
                  </div>
                  {/* {booking.reviewReason ? (
                    <p className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300">
                      {booking.reviewReason}
                    </p>
                  ) : null} */}
                  {booking.status === "PENDING_REVIEW" &&
                  booking.hasReservedConflict ? (
                    <p className="mt-3 rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                      This slot is already reserved by another confirmed
                      booking. You can cancel this request and choose another
                      time.
                    </p>
                  ) : null}
                  {booking.status === "PENDING_REVIEW" ? (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <button
                        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-300/25 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-red-100 transition hover:border-red-300/50 hover:text-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        disabled={
                          isCancelling && cancellingBookingId === booking.id
                        }
                        type="button"
                        onClick={() => handleCancel(booking.id)}
                      >
                        {isCancelling && cancellingBookingId === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Cancel Booking
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-white/10 bg-black/35 px-4 py-8 text-center text-sm text-zinc-500">
              No bookings match this filter.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BookingDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
