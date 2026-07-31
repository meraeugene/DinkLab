"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { createOnsiteBooking } from "@/actions/bookings/createOnsiteBooking";
import { formatSlotLabel, getOperatingHours } from "@/lib/time";
import type { BookingSettings, CourtOption } from "@/types/bookingSettings";

export function OnsiteBookingForm({
  courts,
  date,
  settings,
  onAdded,
}: {
  courts: CourtOption[];
  date: string;
  settings: BookingSettings;
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [startHour, setStartHour] = useState(settings.openHour);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
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
      setStartHour(settings.openHour);
      setOpen(false);
      await onAdded();
    });
  }

  if (!open) {
    return (
      <button
        className="premium-button-dark mt-5 h-11 min-h-11 w-full cursor-pointer rounded-xl px-4 font-display text-xs font-black uppercase tracking-[0.16em] sm:w-auto"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add onsite booking
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="mt-5 rounded-2xl border border-white/12 bg-zinc-950 p-3 sm:p-4"
    >
      <input name="date" type="hidden" value={date} />
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          Court
          <select
            className="h-11 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white focus:border-white/35"
            name="courtId"
            required
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
            name="startHour"
            value={startHour}
            onChange={(event) => setStartHour(Number(event.target.value))}
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
            defaultValue={Math.min(startHour + 1, settings.closeHour)}
            key={startHour}
            name="endHour"
          >
            {hours
              .filter((hour) => hour > startHour)
              .concat(settings.closeHour)
              .filter((hour, index, values) => values.indexOf(hour) === index)
              .map((hour) => (
                <option key={hour} value={hour}>{formatSlotLabel(hour - 1).split("-")[1]}</option>
              ))}
          </select>
        </label>
        <label className="grid gap-2 text-xs font-semibold text-zinc-400">
          Payment status
          <select
            className="h-11 cursor-pointer rounded-xl border border-white/10 bg-black px-3 text-sm text-white focus:border-white/35"
            defaultValue="UNPAID"
            name="paymentStatus"
          >
            <option value="UNPAID">Not paid</option>
            <option value="HALF_PAID">Half paid</option>
            <option value="PAID">Fully paid</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <button
        className="premium-button mt-4 h-11 min-h-11 w-full cursor-pointer rounded-xl px-5 font-display text-xs font-black uppercase tracking-[0.18em] sm:w-auto"
        disabled={pending}
        type="submit"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {pending ? "Adding..." : "Add directly"}
      </button>
    </form>
  );
}
