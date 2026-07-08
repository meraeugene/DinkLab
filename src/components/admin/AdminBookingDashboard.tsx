"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  Bell,
  ExternalLink,
  Mail,
  Phone,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { ADMIN_BOOKINGS_PAGE_SIZE } from "@/data/admin/adminPagination";
import { formatPeso } from "@/lib/pricing";
import { formatManilaDateTime } from "@/lib/time";
import type {
  AdminBooking,
  AdminBookingsPayload,
} from "@/types/admin/adminBooking";
import { formatPaymentMethod } from "@/utils/admin/formatPaymentMethod";
import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";
import { AdminBookingActions } from "./AdminBookingActions";
import { InfoBox } from "./InfoBox";
import { Pagination } from "./Pagination";
import { StatusBadge } from "./StatusBadge";

type AdminBookingDashboardProps = {
  bookingRows: AdminBooking[];
  currentPage: number;
  totalCount: number;
  totalPages: number;
};

export function AdminBookingDashboard({
  bookingRows,
  currentPage,
  totalCount,
  totalPages,
}: AdminBookingDashboardProps) {
  const [notification, setNotification] = useState<string | null>(null);
  const previousTotalCount = useRef(totalCount);
  const fallbackData: AdminBookingsPayload = {
    bookingRows,
    safePage: currentPage,
    totalCount,
    totalPages,
  };
  const { data } = useSWR<AdminBookingsPayload>(
    `/api/admin/bookings?page=${currentPage}`,
    fetchAdminBookings,
    {
      fallbackData,
      revalidateOnFocus: true,
      refreshInterval: 10000,
    },
  );
  const activeData = data || fallbackData;
  const activeBookingRows = activeData.bookingRows;
  const reservedConflictIds = getReservedConflictIds(activeBookingRows);
  const activeCurrentPage = activeData.safePage;
  const activeTotalCount = activeData.totalCount;
  const activeTotalPages = activeData.totalPages;

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

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      {notification ? (
        <div className="fixed right-4 top-4 z-50 flex max-w-xs items-center gap-3 rounded-xl border border-lime-300/25 bg-zinc-950 px-4 py-3 text-sm text-lime-100 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
          <Bell className="h-4 w-4 shrink-0 text-lime-200" />
          <span>{notification}</span>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Dink Lab
            </p>
            <h1 className="mt-2 text-3xl font-display font-black">
              Admin Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Review manual payment submissions. Accepting a booking locks that
              court and time for everyone else.
            </p>
          </div>
          <Link
            className="premium-button h-12 rounded-xl px-5 font-display text-xs font-black uppercase tracking-[0.2em] lg:h-10 lg:min-h-10 lg:px-4 lg:text-[0.65rem]"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Site
          </Link>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                Review Queue
              </p>
              <h2 className="mt-2 truncate text-lg font-black font-display">
                Booking submissions
              </h2>
            </div>
            <p className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-500">
              {activeTotalCount} total
              {activeTotalCount > 0 ? (
                <span className="ml-1 text-zinc-600">
                  ({firstVisible}-{lastVisible})
                </span>
              ) : null}
            </p>
          </div>

          {activeBookingRows.length ? (
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {activeBookingRows.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-xl border border-white/10 bg-zinc-950 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.32)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
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
                        <span className="truncate">
                          {booking.customer_contact}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Pay
                      </p>
                      <p className="text-lg font-black text-white">
                        {formatPeso(booking.downpayment_amount)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        of {formatPeso(booking.total_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <InfoBox
                      label="Court"
                      value={getJoinedCourtName(booking.courts)}
                    />
                    <InfoBox
                      label="Method"
                      value={formatPaymentMethod(booking.payment_method)}
                    />
                    <InfoBox
                      label="Starts"
                      value={formatManilaDateTime(booking.start_at)}
                    />
                    <InfoBox
                      label="Ends"
                      value={formatManilaDateTime(booking.end_at)}
                    />
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
                        className="block overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
                        href={booking.payment_proof_url}
                        target="_blank"
                      >
                        <span
                          aria-hidden="true"
                          className="block aspect-[16/10] bg-cover bg-center sm:aspect-auto sm:h-full"
                          style={{
                            backgroundImage: `url(${booking.payment_proof_url})`,
                          }}
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

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <AdminBookingActions
                      bookingId={booking.id}
                      currentPage={activeCurrentPage}
                      hasReservedConflict={reservedConflictIds.has(booking.id)}
                      status={booking.status}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-10 text-center text-sm text-zinc-500">
              No booking submissions yet.
            </p>
          )}

          {activeTotalPages > 1 ? (
            <Pagination
              currentPage={activeCurrentPage}
              totalPages={activeTotalPages}
            />
          ) : null}
        </section>
      </div>
    </main>
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
