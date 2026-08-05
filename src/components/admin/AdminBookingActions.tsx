"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { acceptBooking } from "@/actions/bookings/acceptBooking";
import { cancelManualBooking } from "@/actions/bookings/cancelManualBooking";
import {
  cancelAcceptedBooking,
  rescheduleAcceptedBooking,
} from "@/actions/bookings/manageAcceptedBooking";
import { formatManilaDateTime, formatSlotLabel, getOperatingHours } from "@/lib/time";
import { ACCEPTED_BOOKINGS_KEY } from "@/hooks/useAcceptedBookings";
import { USER_BOOKING_HISTORY_KEY } from "@/hooks/useUserBookingHistory";
import type { AdminBooking } from "@/types/admin/adminBooking";
import type { BookingSettings, CourtOption } from "@/types/bookingSettings";
import { ActionButton } from "./ActionButton";

type AdminBookingActionsProps = {
  adminBookingsKey: string;
  bookingId: string;
  courts: CourtOption[];
  currentPage: number;
  hasReservedConflict?: boolean;
  schedule: NonNullable<AdminBooking["schedule"]>;
  settings: BookingSettings;
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED" | "REJECTED";
  onRefresh?: () => Promise<void>;
};

export function AdminBookingActions({
  adminBookingsKey,
  bookingId,
  courts,
  currentPage,
  hasReservedConflict = false,
  schedule,
  settings,
  onRefresh,
  status,
}: AdminBookingActionsProps) {
  const { mutate } = useSWRConfig();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptedMode, setAcceptedMode] = useState<"cancel" | "reschedule" | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState(schedule[0]?.id || bookingId);
  const selectedSlot = schedule.find((slot) => slot.id === selectedSlotId) || schedule[0];
  const initialReschedule = getRescheduleInput(selectedSlot?.startAt, settings);
  const durationHours = selectedSlot
    ? Math.max(
        1,
        Math.round(
          (new Date(selectedSlot.endAt).getTime() -
            new Date(selectedSlot.startAt).getTime()) /
            3_600_000,
        ),
      )
    : 1;
  const startHours = getOperatingHours(
    settings.openHour,
    settings.closeHour,
  ).filter((hour) => hour + durationHours <= settings.closeHour);
  const fallbackAdminBookingsKey = `/api/admin/bookings?page=${currentPage}`;

  async function refreshBookingCaches() {
    await Promise.all([
      mutate(adminBookingsKey),
      mutate(fallbackAdminBookingsKey),
      mutate("/api/admin/notifications"),
      mutate(ACCEPTED_BOOKINGS_KEY),
      mutate(USER_BOOKING_HISTORY_KEY),
    ]);
    await onRefresh?.();
  }

  async function handleAccept(formData: FormData) {
    setError(null);
    setSuccess(null);
    const result = await acceptBooking(formData);
    await refreshBookingCaches();
    if (result && !result.ok) {
      setError(result.error || "Unable to accept booking.");
    }
  }

  async function handleReject(formData: FormData) {
    setError(null);
    setSuccess(null);
    const result = await cancelManualBooking(formData);
    await refreshBookingCaches();
    if (result && !result.ok) {
      setError(result.error || "Unable to reject booking.");
    }
  }

  async function handleAcceptedCancellation(formData: FormData) {
    setError(null);
    setSuccess(null);
    const result = await cancelAcceptedBooking(formData);
    if (!result.ok) {
      setError(result.error || "Unable to cancel reservation.");
      return;
    }
    setAcceptedMode(null);
    setSuccess("Reservation cancelled and its slots are now available.");
    await refreshBookingCaches();
  }

  async function handleReschedule(formData: FormData) {
    setError(null);
    setSuccess(null);
    const result = await rescheduleAcceptedBooking(formData);
    if (!result.ok) {
      setError(result.error || "Unable to reschedule reservation.");
      return;
    }
    setAcceptedMode(null);
    setSuccess("Reservation moved successfully.");
    await refreshBookingCaches();
  }

  if (status === "ACCEPTED") {
    return (
      <div className="grid gap-3">
        <p className="admin-action-button rounded-lg border border-lime-300/20 bg-lime-300/10 px-4 text-center font-display text-xs font-black uppercase tracking-[0.18em] text-lime-200">
          Confirmed
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="admin-action-button cursor-pointer rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/50"
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setAcceptedMode((current) => current === "reschedule" ? null : "reschedule");
            }}
          >
            Reschedule
          </button>
          <button
            className="admin-action-button cursor-pointer rounded-lg border border-red-300/25 bg-red-400/10 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-red-100 transition hover:border-red-200/50"
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setAcceptedMode((current) => current === "cancel" ? null : "cancel");
            }}
          >
            Cancel reservation
          </button>
        </div>

        {acceptedMode === "reschedule" && selectedSlot ? (
          <form
            action={handleReschedule}
            className="grid gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] p-3"
            key={selectedSlot.id}
          >
            <p className="text-xs leading-5 text-zinc-400">
              Move one schedule item while keeping its {durationHours}-hour duration and payment amount.
            </p>
            {schedule.length > 1 ? (
              <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                Schedule item
                <select
                  className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                  value={selectedSlotId}
                  onChange={(event) => setSelectedSlotId(event.target.value)}
                >
                  {schedule.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.courtName} — {formatManilaDateTime(slot.startAt)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <input name="bookingId" type="hidden" value={selectedSlot.id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                New date
                <input
                  className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                  name="date"
                  required
                  type="date"
                  defaultValue={initialReschedule.date}
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                New court
                <select
                  className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                  name="courtId"
                  required
                  defaultValue={selectedSlot.courtId || courts[0]?.id || ""}
                >
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>{court.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                New start time
                <select
                  className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                  name="startHour"
                  defaultValue={initialReschedule.hour}
                >
                  {startHours.map((hour) => (
                    <option key={hour} value={hour}>
                      {formatSlotLabel(hour).split("-")[0]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionButton className="admin-action-button premium-button w-full cursor-pointer rounded-lg px-4 font-display text-xs font-black uppercase tracking-[0.18em]">
                Save new slot
              </ActionButton>
              <button
                className="admin-action-button cursor-pointer rounded-lg border border-white/10 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-zinc-300"
                type="button"
                onClick={() => setAcceptedMode(null)}
              >
                Keep current slot
              </button>
            </div>
          </form>
        ) : null}

        {acceptedMode === "cancel" ? (
          <form
            action={handleAcceptedCancellation}
            className="grid gap-3 rounded-xl border border-red-300/20 bg-red-400/[0.05] p-3"
          >
            <input name="bookingId" type="hidden" value={bookingId} />
            <p className="text-xs leading-5 text-red-100">
              This cancels the whole reservation and releases all {schedule.length || 1} slot(s). Handle any refund separately.
            </p>
            <label className="grid gap-2 text-xs font-semibold text-zinc-400">
              Cancellation note (optional)
              <input
                className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                maxLength={300}
                name="reason"
                placeholder="Reason shown in booking history"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionButton className="admin-action-button w-full cursor-pointer rounded-lg border border-red-300/35 bg-red-400/15 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-red-100">
                Confirm cancellation
              </ActionButton>
              <button
                className="admin-action-button cursor-pointer rounded-lg border border-white/10 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-zinc-300"
                type="button"
                onClick={() => setAcceptedMode(null)}
              >
                Keep reservation
              </button>
            </div>
          </form>
        ) : null}

        {success ? (
          <p className="rounded-lg border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-xs font-semibold text-lime-100">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-100">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <p className="admin-action-button rounded-lg border border-red-300/20 bg-red-400/10 px-4 text-center font-display text-xs font-black uppercase tracking-[0.18em] text-red-100">
        Rejected
      </p>
    );
  }

  if (status === "CANCELLED") {
    return (
      <p className="admin-action-button rounded-lg border border-zinc-500/30 bg-white/[0.025] px-4 text-center font-display text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
        Cancelled
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
            <input
              name="reason"
              type="hidden"
              value="Payment review was rejected by admin."
            />
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

function getRescheduleInput(
  value: string | undefined,
  settings: BookingSettings,
) {
  if (!value) return { date: "", hour: settings.openHour };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  let date = `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
  let hour = Number(getPart("hour"));

  if (settings.closeHour > 24 && hour < settings.openHour) {
    const previousDate = new Date(`${date}T00:00:00Z`);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    date = previousDate.toISOString().slice(0, 10);
    hour += 24;
  }

  return { date, hour };
}
