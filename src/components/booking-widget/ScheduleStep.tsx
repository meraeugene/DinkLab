"use client";

import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import type { CourtSlot } from "@/lib/time";
import type {
  Availability,
  AvailabilityByDate,
  BookingSelection,
} from "@/types/bookingWidget";
import type { CourtOption } from "@/types/bookingSettings";
import { formatPeso } from "@/lib/pricing";
import {
  formatLongDate,
  formatTimeCardLabel,
  getDayStatus,
  isSameMonth,
} from "@/utils/booking/bookingWidgetCalendar";
import { DayStep } from "./DayStep";

export function ScheduleStep({
  availabilityByDate,
  calendarDates,
  calendarMonth,
  courts,
  date,
  displaySlotsByCourt,
  initialDate,
  loading,
  selections,
  onChooseSlot,
  onContinue,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
}: {
  availabilityByDate: AvailabilityByDate;
  calendarDates: string[];
  calendarMonth: string;
  courts: CourtOption[];
  date: string;
  displaySlotsByCourt: Availability;
  initialDate: string;
  loading: boolean;
  selections: BookingSelection[];
  onChooseSlot: (courtId: string, slot: CourtSlot) => void;
  onContinue: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDate: (date: string) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateRailRef = useRef<HTMLDivElement>(null);
  const courtIds = courts.map((court) => court.id);
  const dateRail = calendarDates.filter(
    (item) => isSameMonth(item, calendarMonth) && item >= initialDate,
  );
  const hours = Array.from(
    new Set(
      courts.flatMap((court) =>
        (displaySlotsByCourt[court.id] || []).map((slot) => slot.startHour),
      ),
    ),
  ).sort((a, b) => a - b);
  const total = selections.reduce((sum, selection) => {
    const slot = displaySlotsByCourt[selection.courtId]?.find(
      (item) => item.startHour === selection.startHour,
    );
    return sum + (slot?.rate || 0);
  }, 0);

  function chooseDate(value: string) {
    setCalendarOpen(false);
    onSelectDate(value);
  }

  function moveDateRail(direction: -1 | 1) {
    const rail = dateRailRef.current;
    if (!rail) return;

    rail.scrollBy({
      behavior: "smooth",
      left: direction * rail.clientWidth,
    });
  }

  return (
    <div className="grid w-full min-w-0 gap-5 pb-3">
      <section aria-labelledby="booking-date-heading" className="min-w-0">
        <p
          className="font-display text-[0.65rem] font-black uppercase tracking-[0.24em] text-zinc-500"
          id="booking-date-heading"
        >
          When
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 whitespace-nowrap text-sm font-bold text-white sm:text-lg">
            {formatLongDate(date)}
          </p>
          <button
            aria-expanded={calendarOpen}
            className="premium-button-dark h-11 min-h-11 w-24 shrink-0 cursor-pointer rounded-xl px-3 text-[0.68rem] sm:w-28"
            type="button"
            onClick={() => setCalendarOpen((current) => !current)}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Calendar</span>
          </button>
        </div>

        <div className="mt-3 flex min-w-0 items-center gap-2">
          <button
            aria-label="Show previous dates"
            className="hidden h-14 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white transition hover:border-white/40 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:grid"
            type="button"
            onClick={() => moveDateRail(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto pb-2 md:overflow-x-hidden md:pb-0"
            ref={dateRailRef}
          >
            {dateRail.map((item) => {
              const status = getCombinedDayStatus(
                item,
                initialDate,
                courtIds,
                availabilityByDate,
              );
              const active = item === date;
              const disabled = status !== "available";
              const label = getDateRailLabel(item, initialDate);

              return (
                <button
                  aria-label={`${label.longLabel}, ${status}`}
                  aria-pressed={active}
                  className={[
                    "min-h-14 w-16 shrink-0 snap-start rounded-xl border px-1.5 py-1.5 text-center transition",
                    disabled ? "cursor-not-allowed" : "cursor-pointer",
                    active
                      ? "border-white/75 bg-white/[0.13] text-white shadow-[0_0_20px_rgba(255,255,255,0.12)]"
                      : status === "full"
                        ? "border-red-300/15 bg-red-400/[0.07] text-zinc-600"
                        : disabled
                          ? "border-white/[0.06] bg-white/[0.015] text-zinc-700"
                          : "border-white/12 bg-white/[0.035] text-zinc-300 hover:border-white/40 hover:bg-white/[0.07]",
                  ].join(" ")}
                  disabled={disabled}
                  key={item}
                  type="button"
                  onClick={() => chooseDate(item)}
                >
                  <span className="block text-[0.58rem] font-black uppercase tracking-[0.14em] text-zinc-500">
                    {label.shortLabel}
                  </span>
                  <span className="mt-1 block font-display text-base font-black leading-none">
                    {Number(item.slice(-2))}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            aria-label="Show next dates"
            className="hidden h-14 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white transition hover:border-white/40 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:grid"
            type="button"
            onClick={() => moveDateRail(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {calendarOpen ? (
          <div className="mt-3">
            <DayStep
              availabilityByDate={availabilityByDate}
              calendarDates={calendarDates}
              calendarMonth={calendarMonth}
              courtIds={courtIds}
              date={date}
              initialDate={initialDate}
              onNextMonth={onNextMonth}
              onPreviousMonth={onPreviousMonth}
              onSelectDate={chooseDate}
            />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="court-time-heading" className="min-w-0">
        <p
          className="font-display text-[0.65rem] font-black uppercase tracking-[0.24em] text-zinc-500"
          id="court-time-heading"
        >
          Court &amp; Time
        </p>
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/12 bg-zinc-950 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
          <div className="border-b border-white/10 px-4 py-4">
            <h4 className="font-display text-base font-black uppercase tracking-[0.12em] text-white">
              All courts, one schedule
            </h4>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Tap available times to build your booking. Swipe sideways for more courts.
            </p>
          </div>

          <div className="overflow-x-auto overscroll-x-contain">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `5.75rem repeat(${courts.length}, minmax(9.25rem, 1fr))`,
                minWidth: `${92 + courts.length * 148}px`,
              }}
            >
              <div className="sticky left-0 z-20 flex min-h-20 items-center border-b border-r border-white/10 bg-zinc-950 px-3 font-display text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Time
              </div>
              {courts.map((court) => (
                <div
                  className="flex min-h-20 min-w-0 flex-col justify-center border-b border-r border-white/10 bg-white/[0.035] px-3 last:border-r-0"
                  key={court.id}
                >
                  <span className="font-display text-sm font-black uppercase tracking-[0.1em] text-white">
                    {court.name}
                  </span>
                  {court.description ? (
                    <span className="mt-1 line-clamp-2 text-[0.65rem] leading-4 text-zinc-500">
                      {court.description}
                    </span>
                  ) : (
                    <span className="mt-1 text-[0.65rem] text-zinc-600">DinkLab court</span>
                  )}
                </div>
              ))}

              {hours.map((hour) => (
                <ScheduleRow
                  courts={courts}
                  displaySlotsByCourt={displaySlotsByCourt}
                  hour={hour}
                  key={hour}
                  loading={loading}
                  selections={selections}
                  onChooseSlot={onChooseSlot}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-30 rounded-2xl border border-white/15 bg-zinc-950/95 p-3 shadow-[0_-18px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="mb-3 min-w-0 sm:mb-0">
          <p className="text-xs font-semibold text-zinc-400">
            {selections.length
              ? `${selections.length} court-hour${selections.length === 1 ? "" : "s"} selected`
              : "Select a time to continue"}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs text-zinc-500">Total</span>
            <span className="font-display text-2xl font-black text-white">
              {formatPeso(total)}
            </span>
          </div>
        </div>
        <button
          className="premium-button font-display h-12 w-full cursor-pointer rounded-xl px-5 text-xs font-black uppercase tracking-[0.22em] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          disabled={!selections.length || loading}
          type="button"
          onClick={onContinue}
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ScheduleRow({
  courts,
  displaySlotsByCourt,
  hour,
  loading,
  selections,
  onChooseSlot,
}: {
  courts: CourtOption[];
  displaySlotsByCourt: Availability;
  hour: number;
  loading: boolean;
  selections: BookingSelection[];
  onChooseSlot: (courtId: string, slot: CourtSlot) => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex min-h-24 items-center whitespace-nowrap border-b border-r border-white/10 bg-zinc-950 px-3 text-xs font-bold text-zinc-300">
        {formatTimeCardLabel(hour, hour + 1)}
      </div>
      {courts.map((court) => {
        const slot = displaySlotsByCourt[court.id]?.find(
          (item) => item.startHour === hour,
        );
        const selected = selections.some(
          (item) => item.courtId === court.id && item.startHour === hour,
        );
        const available = Boolean(slot?.available);

        return (
          <button
            aria-label={`${court.name}, ${formatTimeCardLabel(hour, hour + 1)}, ${available ? `${formatPeso(slot?.rate || 0)}, available` : slot?.occupiedByName ? `reserved by ${slot.occupiedByName}` : "unavailable"}`}
            aria-pressed={selected}
            className={[
              "group flex min-h-24 min-w-0 flex-col items-center justify-center border-b border-r p-2 text-center transition last:border-r-0",
              selected
                ? "cursor-pointer border-white/25 bg-white text-black"
                : available
                  ? "cursor-pointer border-white/10 bg-white/[0.025] text-white hover:bg-white/[0.08]"
                  : slot?.occupiedByName
                    ? "cursor-not-allowed border-emerald-300/10 bg-emerald-400/[0.055] text-zinc-500"
                    : "cursor-not-allowed border-white/[0.06] bg-white/[0.012] text-zinc-700",
            ].join(" ")}
            disabled={!available || loading}
            key={court.id}
            type="button"
            onClick={() => slot && onChooseSlot(court.id, slot)}
          >
            {loading ? (
              <>
                <span className="h-4 w-14 animate-pulse rounded-full bg-white/10" />
                <span className="mt-2 h-3 w-20 animate-pulse rounded-full bg-white/[0.07]" />
              </>
            ) : (
              selected || available ? (
                <>
                  <span className="font-display text-base font-black">
                    {formatPeso(slot?.rate || 0)}
                  </span>
                  <span
                    className={[
                      "mt-1 flex items-center justify-center gap-1 text-[0.65rem] font-semibold",
                      selected ? "text-black/65" : "text-zinc-300",
                    ].join(" ")}
                  >
                    <Check className="h-3 w-3 shrink-0" />
                    {selected ? "Selected" : "Available"}
                  </span>
                </>
              ) : slot?.occupiedByName ? (
                <>
                  <span className="font-display text-[0.68rem] font-black uppercase tracking-[0.14em] text-emerald-200/75">
                    Reserved
                  </span>
                  <span className="mt-1 max-w-full whitespace-normal break-words text-[0.65rem] font-semibold leading-4 text-zinc-400">
                    {slot.occupiedByName}
                  </span>
                </>
              ) : (
                <span className="font-display text-[0.68rem] font-black uppercase tracking-[0.12em] text-zinc-700">
                  Unavailable
                </span>
              )
            )}
          </button>
        );
      })}
    </>
  );
}

function getCombinedDayStatus(
  date: string,
  initialDate: string,
  courtIds: string[],
  availabilityByDate: AvailabilityByDate,
) {
  const dayAvailability = availabilityByDate[date];
  const slots = dayAvailability && courtIds.every((courtId) => dayAvailability[courtId])
    ? courtIds.flatMap((courtId) => dayAvailability[courtId])
    : undefined;
  return getDayStatus(date, initialDate, slots);
}

function getDateRailLabel(date: string, initialDate: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(value);
  return {
    longLabel: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      dateStyle: "full",
    }).format(value),
    shortLabel: date === initialDate ? "Today" : weekday,
  };
}
