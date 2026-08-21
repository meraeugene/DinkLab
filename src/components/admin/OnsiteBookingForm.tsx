"use client";

import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { createOnsiteBooking } from "@/actions/bookings/createOnsiteBooking";
import { formatSlotLabel, getOperatingHours } from "@/lib/time";
import type { BookingSettings, CourtOption } from "@/types/bookingSettings";

type OnsiteScheduleInput = {
  id: number;
  courtId: string;
  startHour: number;
  endHour: number;
};

export function OnsiteBookingForm({
  courts,
  date,
  lockError,
  settings,
  onAdded,
}: {
  courts: CourtOption[];
  date: string;
  lockError: string | null;
  settings: BookingSettings;
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [schedules, setSchedules] = useState<OnsiteScheduleInput[]>(() => [
    createSchedule(0, courts[0]?.id || "", settings.openHour, settings.closeHour),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextScheduleId = useRef(1);
  const hours = getOperatingHours(settings.openHour, settings.closeHour);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createOnsiteBooking(formData);
      if (!result.ok) {
        setError(result.error || "Unable to add onsite booking.");
        return;
      }
      setCustomerName("");
      setCustomerContact("");
      setPaymentStatus("UNPAID");
      setSchedules([
        createSchedule(0, courts[0]?.id || "", settings.openHour, settings.closeHour),
      ]);
      nextScheduleId.current = 1;
      setOpen(false);
      await onAdded();
    });
  }

  function addSchedule() {
    setSchedules((current) => {
      const previous = current.at(-1);
      const unusedCourt = courts.find(
        (court) => !current.some((schedule) => schedule.courtId === court.id),
      );
      const startHour = previous?.startHour ?? settings.openHour;
      return [
        ...current,
        createSchedule(
          nextScheduleId.current++,
          unusedCourt?.id || previous?.courtId || courts[0]?.id || "",
          startHour,
          settings.closeHour,
        ),
      ];
    });
  }

  function updateSchedule(
    id: number,
    values: Partial<Omit<OnsiteScheduleInput, "id">>,
  ) {
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.id === id ? { ...schedule, ...values } : schedule,
      ),
    );
  }

  function removeSchedule(id: number) {
    setSchedules((current) => current.filter((schedule) => schedule.id !== id));
  }

  if (!open) {
    return (
      <div className="mt-5">
        <button
          className="premium-button-dark h-11 min-h-11 w-full cursor-pointer rounded-xl px-4 font-display text-xs font-black uppercase tracking-[0.16em] sm:w-auto"
          type="button"
          onClick={() => {
            if (lockError) {
              setError(lockError);
              return;
            }
            setError(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add onsite booking
        </button>
        {error ? (
          <p
            className="mt-3 rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-sm text-red-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      action={submit}
      className="mt-5 rounded-2xl border border-white/12 bg-zinc-950 p-3 sm:p-4"
    >
      <input name="date" type="hidden" value={date} />
      <input
        name="schedules"
        type="hidden"
        value={JSON.stringify(
          schedules.map(({ courtId, startHour, endHour }) => ({
            courtId,
            startHour,
            endHour,
          })),
        )}
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
            Direct entry
          </p>
          <h3 className="mt-1 font-display text-base font-black">Add onsite booking</h3>
        </div>
        <button
          aria-label="Close onsite booking form"
          className="menu-icon-button cursor-pointer"
          type="button"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-xs font-semibold text-zinc-400">
          Customer name
          <input
            className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-white/35"
            name="customerName"
            required
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold text-zinc-400">
          Contact number
          <input
            className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-white/35"
            name="customerContact"
            required
            value={customerContact}
            onChange={(event) => setCustomerContact(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold text-zinc-400">
          Payment status
          <select
            className="h-11 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white focus:border-white/35"
            name="paymentStatus"
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
          >
            <option value="UNPAID">Not paid</option>
            <option value="HALF_PAID">Half paid</option>
            <option value="PAID">Fully paid</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
              Courts and hours
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Add every court and time included in this booking.
            </p>
          </div>
          <button
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-bold text-zinc-200 transition hover:border-white/35 hover:bg-white/[0.06]"
            disabled={pending || !courts.length}
            type="button"
            onClick={addSchedule}
          >
            <Plus className="h-4 w-4" />
            Add schedule
          </button>
        </div>

        {schedules.map((schedule, index) => (
          <section
            className="rounded-xl border border-white/10 bg-white/[0.025] p-3"
            key={schedule.id}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-display text-xs font-black uppercase tracking-[0.14em] text-zinc-300">
                Schedule {index + 1}
              </p>
              {schedules.length > 1 ? (
                <button
                  aria-label={`Remove schedule ${index + 1}`}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 text-zinc-500 transition hover:border-red-300/30 hover:text-red-200"
                  disabled={pending}
                  type="button"
                  onClick={() => removeSchedule(schedule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                Court
                <select
                  className="h-11 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white focus:border-white/35"
                  required
                  value={schedule.courtId}
                  onChange={(event) =>
                    updateSchedule(schedule.id, { courtId: event.target.value })
                  }
                >
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>{court.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                Start time
                <select
                  className="h-11 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white focus:border-white/35"
                  value={schedule.startHour}
                  onChange={(event) => {
                    const startHour = Number(event.target.value);
                    updateSchedule(schedule.id, {
                      startHour,
                      endHour:
                        schedule.endHour > startHour
                          ? schedule.endHour
                          : Math.min(startHour + 1, settings.closeHour),
                    });
                  }}
                >
                  {hours.map((hour) => (
                    <option key={hour} value={hour}>{formatSlotLabel(hour).split("-")[0]}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                End time
                <select
                  className="h-11 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white focus:border-white/35"
                  value={schedule.endHour}
                  onChange={(event) =>
                    updateSchedule(schedule.id, { endHour: Number(event.target.value) })
                  }
                >
                  {getEndHours(schedule.startHour, hours, settings.closeHour).map((hour) => (
                    <option key={hour} value={hour}>{formatSlotLabel(hour - 1).split("-")[1]}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        ))}
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <button
        className="premium-button mt-4 h-11 min-h-11 w-full cursor-pointer rounded-xl px-5 font-display text-xs font-black uppercase tracking-[0.18em] sm:w-auto"
        disabled={pending || !courts.length || !schedules.length}
        type="submit"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {pending ? "Adding..." : "Add directly"}
      </button>
    </form>
  );
}

function createSchedule(
  id: number,
  courtId: string,
  startHour: number,
  closeHour: number,
): OnsiteScheduleInput {
  return {
    id,
    courtId,
    startHour,
    endHour: Math.min(startHour + 1, closeHour),
  };
}

function getEndHours(startHour: number, hours: number[], closeHour: number) {
  return hours
    .filter((hour) => hour > startHour)
    .concat(closeHour)
    .filter((hour, index, values) => values.indexOf(hour) === index);
}
