"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { acceptBooking } from "@/actions/bookings/acceptBooking";
import { cancelManualBooking } from "@/actions/bookings/cancelManualBooking";
import { ACCEPTED_BOOKINGS_KEY } from "@/hooks/useAcceptedBookings";
import { ActionButton } from "./ActionButton";

type AdminBookingActionsProps = {
  bookingId: string;
  currentPage: number;
  hasReservedConflict?: boolean;
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED";
};

export function AdminBookingActions({
  bookingId,
  currentPage,
  hasReservedConflict = false,
  status,
}: AdminBookingActionsProps) {
  const { mutate } = useSWRConfig();
  const [error, setError] = useState<string | null>(null);
  const adminBookingsKey = `/api/admin/bookings?page=${currentPage}`;

  async function refreshBookingCaches() {
    await Promise.all([
      mutate(adminBookingsKey),
      mutate("/api/admin/notifications"),
      mutate(ACCEPTED_BOOKINGS_KEY),
    ]);
  }

  async function handleAccept(formData: FormData) {
    setError(null);
    const result = await acceptBooking(formData);
    await refreshBookingCaches();
    if (result && !result.ok) {
      setError(result.error || "Unable to accept booking.");
    }
  }

  async function handleReject(formData: FormData) {
    setError(null);
    await cancelManualBooking(formData);
    await refreshBookingCaches();
  }

  if (status === "ACCEPTED") {
    return (
      <p className="admin-action-button rounded-lg border border-lime-300/20 bg-lime-300/10 px-4 text-center font-display text-xs font-black uppercase tracking-[0.18em] text-lime-200">
        Accepted
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {hasReservedConflict ? (
        <p className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-center text-xs font-semibold text-emerald-100">
          This slot is already reserved by another accepted booking.
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {status === "PENDING_REVIEW" ? (
          hasReservedConflict ? (
            <p className="admin-action-button rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-4 text-center font-display text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
              Reserved
            </p>
          ) : (
            <form className="w-full" action={handleAccept}>
              <input name="bookingId" type="hidden" value={bookingId} />
              <ActionButton className="premium-button admin-action-button w-full cursor-pointer rounded-lg px-4 font-display text-xs font-black uppercase tracking-[0.18em]">
                Accept
              </ActionButton>
            </form>
          )
        ) : null}
        {status === "PENDING_REVIEW" ? (
          <form className="w-full" action={handleReject}>
            <input name="bookingId" type="hidden" value={bookingId} />
            <ActionButton className="admin-action-button w-full cursor-pointer rounded-lg border border-white/15 bg-white/[0.035] px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:border-red-300/35 hover:bg-red-400/10 hover:text-red-100">
              Reject
            </ActionButton>
          </form>
        ) : null}
      </div>
      {error ? (
        <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-center text-xs font-semibold text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
