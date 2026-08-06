"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSWRConfig } from "swr";
import { acceptBooking } from "@/actions/bookings/acceptBooking";
import { cancelManualBooking } from "@/actions/bookings/cancelManualBooking";
import {
  cancelAcceptedBooking,
  rescheduleAcceptedBooking,
} from "@/actions/bookings/manageAcceptedBooking";
import { formatPeso } from "@/lib/pricing";
import { formatSlotLabel, getOperatingHours } from "@/lib/time";
import { ACCEPTED_BOOKINGS_KEY } from "@/hooks/useAcceptedBookings";
import { USER_BOOKING_HISTORY_KEY } from "@/hooks/useUserBookingHistory";
import type { AdminBooking } from "@/types/admin/adminBooking";
import type { BookingSettings, CourtOption } from "@/types/bookingSettings";
import { ActionButton } from "./ActionButton";

type AdminBookingActionsProps = {
  adminBookingsKey: string;
  bookingId: string;
  compact?: boolean;
  courts: CourtOption[];
  currentPage: number;
  hasReservedConflict?: boolean;
  schedule: NonNullable<AdminBooking["schedule"]>;
  settings: BookingSettings;
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED" | "REJECTED";
  onRefresh?: () => Promise<void>;
};

type RescheduleRow = {
  id: string;
  courtId: string;
  date: string;
  startHour: number;
  endHour: number;
};

export function AdminBookingActions({
  adminBookingsKey,
  bookingId,
  compact = false,
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
  const [rescheduleRows, setRescheduleRows] = useState<RescheduleRow[]>(() =>
    buildRescheduleRows(schedule, settings),
  );
  const startHours = getOperatingHours(settings.openHour, settings.closeHour);
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
    formData.set("slots", JSON.stringify(rescheduleRows));
    const result = await rescheduleAcceptedBooking(formData);
    if (!result.ok) {
      setError(result.error || "Unable to reschedule reservation.");
      return;
    }
    setAcceptedMode(null);
    const totalAmount = "totalAmount" in result ? result.totalAmount : undefined;
    setSuccess(
      typeof totalAmount === "number"
        ? `Reservation moved successfully. New total: ${formatPeso(totalAmount)}.`
        : "Reservation moved successfully.",
    );
    await refreshBookingCaches();
  }

  function openReschedule() {
    setError(null);
    setSuccess(null);
    setRescheduleRows(buildRescheduleRows(schedule, settings));
    setAcceptedMode("reschedule");
  }

  function updateRescheduleRow(
    id: string,
    updates: Partial<RescheduleRow>,
  ) {
    setRescheduleRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    );
  }

  function addRescheduleRow() {
    const firstRow = rescheduleRows[0];
    if (!firstRow || rescheduleRows.length >= 40) return;
    const usedCourtIds = new Set(rescheduleRows.map((row) => row.courtId));
    const nextCourt =
      courts.find((court) => !usedCourtIds.has(court.id)) || courts[0];
    if (!nextCourt) return;

    setRescheduleRows((current) => [
      ...current,
      {
        ...firstRow,
        id: crypto.randomUUID(),
        courtId: nextCourt.id,
      },
    ]);
  }

  function removeAddedRescheduleRow(id: string) {
    if (schedule.some((slot) => slot.id === id)) return;
    setRescheduleRows((current) => current.filter((row) => row.id !== id));
  }

  const acceptedActionButtonClass = compact
    ? "inline-flex h-10 min-w-0 cursor-pointer items-center justify-center rounded-lg border px-2 font-display text-[0.65rem] font-black uppercase tracking-[0.1em] transition"
    : "admin-action-button cursor-pointer rounded-lg border px-4 font-display text-xs font-black uppercase tracking-[0.18em] transition";

  if (status === "ACCEPTED") {
    return (
      <div className={compact ? "grid gap-2" : "grid gap-3"}>
        {!compact ? (
          <p className="admin-action-button rounded-lg border border-lime-300/20 bg-lime-300/10 px-4 text-center font-display text-xs font-black uppercase tracking-[0.18em] text-lime-200">
            Confirmed
          </p>
        ) : null}
        <div className={compact ? "grid gap-2" : "grid gap-2 sm:grid-cols-2"}>
          <button
            className={`${acceptedActionButtonClass} border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:border-cyan-200/50 hover:bg-cyan-300/20`}
            type="button"
            onClick={openReschedule}
          >
            Reschedule
          </button>
          <button
            className={`${acceptedActionButtonClass} border-red-300/25 bg-red-400/10 text-red-100 hover:border-red-200/50 hover:bg-red-400/20`}
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setAcceptedMode((current) => current === "cancel" ? null : "cancel");
            }}
          >
            {compact ? "Cancel" : "Cancel reservation"}
          </button>
        </div>

        {acceptedMode === "reschedule" && rescheduleRows.length ? (
          <div
            aria-label="Reschedule booking"
            aria-modal="true"
            className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
          >
            <form
              action={handleReschedule}
              className="grid max-h-[calc(100vh-2rem)] w-full max-w-4xl gap-4 overflow-y-auto rounded-2xl border border-cyan-300/25 bg-zinc-950 p-4 shadow-2xl sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-display text-base font-black text-white">
                    Reschedule booking
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    Edit every court schedule below. Duration and payment totals
                    will be recalculated automatically from the selected hours.
                  </p>
                </div>
                <button
                  className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/20"
                  disabled={rescheduleRows.length >= 40 || !courts.length}
                  type="button"
                  onClick={addRescheduleRow}
                >
                  <Plus className="h-4 w-4" />
                  Add court
                </button>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-100">
                  {error}
                </p>
              ) : null}

              <input name="bookingId" type="hidden" value={bookingId} />

              <div className="grid gap-3">
                {rescheduleRows.map((row, index) => (
                  <section
                    className="rounded-xl border border-white/10 bg-black/35 p-3"
                    key={row.id}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-display text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                        Schedule {index + 1}
                      </p>
                      {!schedule.some((slot) => slot.id === row.id) ? (
                        <button
                          aria-label={`Remove schedule ${index + 1}`}
                          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-red-300/20 bg-red-400/[0.06] px-2.5 text-xs font-bold text-red-100 transition hover:border-red-200/45 hover:bg-red-400/15"
                          type="button"
                          onClick={() => removeAddedRescheduleRow(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                        New date
                        <input
                          className="h-11 min-w-0 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                          required
                          type="date"
                          value={row.date}
                          onChange={(event) =>
                            updateRescheduleRow(row.id, {
                              date: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                        New court
                        <select
                          className="h-11 min-w-0 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                          required
                          value={row.courtId}
                          onChange={(event) =>
                            updateRescheduleRow(row.id, {
                              courtId: event.target.value,
                            })
                          }
                        >
                          {courts.map((court) => (
                            <option key={court.id} value={court.id}>
                              {court.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                        Start time
                        <select
                          className="h-11 min-w-0 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                          value={row.startHour}
                          onChange={(event) => {
                            const startHour = Number(event.target.value);
                            updateRescheduleRow(row.id, {
                              startHour,
                              endHour:
                                row.endHour > startHour
                                  ? row.endHour
                                  : startHour + 1,
                            });
                          }}
                        >
                          {startHours.map((hour) => (
                            <option key={hour} value={hour}>
                              {formatSlotLabel(hour).split("-")[0]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                        End time
                        <select
                          className="h-11 min-w-0 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
                          value={row.endHour}
                          onChange={(event) =>
                            updateRescheduleRow(row.id, {
                              endHour: Number(event.target.value),
                            })
                          }
                        >
                          {buildEndHourOptions(
                            row.startHour,
                            settings.closeHour,
                          ).map((hour) => (
                            <option key={hour} value={hour}>
                              {formatEndHourLabel(hour)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <ActionButton className="admin-action-button premium-button w-full cursor-pointer rounded-lg px-4 font-display text-xs font-black uppercase tracking-[0.18em]">
                  Save new schedule
                </ActionButton>
                <button
                  className="admin-action-button cursor-pointer rounded-lg border border-white/10 bg-white/[0.015] px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                  type="button"
                  onClick={() => setAcceptedMode(null)}
                >
                  Keep current schedule
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {acceptedMode === "cancel" ? (
          <div
            aria-label="Confirm booking cancellation"
            aria-modal="true"
            className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
          >
            <form
              action={handleAcceptedCancellation}
              className="grid max-h-[calc(100vh-2rem)] w-full max-w-lg gap-3 overflow-y-auto rounded-2xl border border-red-300/25 bg-zinc-950 p-4 shadow-2xl sm:p-5"
            >
              <h3 className="font-display text-base font-black text-white">
                Cancel reservation
              </h3>
            {error ? (
              <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-100">
                {error}
              </p>
            ) : null}
            <input name="bookingId" type="hidden" value={bookingId} />
            <p className="text-xs leading-5 text-red-100">
              This will cancel the entire reservation and release all {schedule.length || 1} slot(s). This cannot be undone from the dashboard. Handle any refund separately.
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
              <ActionButton className="admin-action-button w-full cursor-pointer rounded-lg border border-red-300/35 bg-red-400/15 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-red-100 transition hover:border-red-200/60 hover:bg-red-400/30 hover:text-white">
                Confirm cancellation
              </ActionButton>
              <button
                className="admin-action-button cursor-pointer rounded-lg border border-white/10 bg-white/[0.015] px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                type="button"
                onClick={() => setAcceptedMode(null)}
              >
                Keep reservation
              </button>
            </div>
            </form>
          </div>
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
    if (compact) {
      return <p className="py-2 text-xs text-zinc-600">No further actions</p>;
    }

    return (
      <p className="admin-action-button rounded-lg border border-red-300/20 bg-red-400/10 px-4 text-center font-display text-xs font-black uppercase tracking-[0.18em] text-red-100">
        Rejected
      </p>
    );
  }

  if (status === "CANCELLED") {
    if (compact) {
      return <p className="py-2 text-xs text-zinc-600">No further actions</p>;
    }

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
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-2 sm:grid-cols-2"}>
        {status === "PENDING_REVIEW" ? (
          hasReservedConflict ? (
            <p className={`${compact ? "inline-flex h-10 items-center justify-center" : "admin-action-button"} rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 text-center font-display text-xs font-black uppercase tracking-[0.12em] text-emerald-100`}>
              Reserved
            </p>
          ) : (
            <form className="w-full" action={handleAccept}>
              <input name="bookingId" type="hidden" value={bookingId} />
              <ActionButton className={`premium-button ${compact ? "h-10 min-h-10" : "admin-action-button"} w-full cursor-pointer rounded-lg px-3 font-display text-xs font-black uppercase tracking-[0.12em]`}>
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
            <ActionButton className={`${compact ? "h-10 min-h-10" : "admin-action-button"} w-full cursor-pointer rounded-lg border border-white/15 bg-white/[0.035] px-3 font-display text-xs font-black uppercase tracking-[0.12em] text-zinc-200 transition hover:border-red-300/35 hover:bg-red-400/10 hover:text-red-100`}>
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

function buildRescheduleRows(
  schedule: NonNullable<AdminBooking["schedule"]>,
  settings: BookingSettings,
): RescheduleRow[] {
  return schedule.map((slot) => {
    const start = getRescheduleInput(slot.startAt, settings);
    const end = getRescheduleInput(slot.endAt, settings);

    return {
      id: slot.id,
      courtId: slot.courtId,
      date: start.date,
      startHour: start.hour,
      endHour: Math.max(start.hour + 1, end.hour),
    };
  });
}

function buildEndHourOptions(startHour: number, closeHour: number) {
  return Array.from(
    { length: Math.max(0, closeHour - startHour) },
    (_, index) => startHour + index + 1,
  );
}

function formatEndHourLabel(hour: number) {
  return formatSlotLabel(hour - 1).split("-")[1];
}
