import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { AvailabilityByDate, DayStatus } from "@/types/bookingWidget";
import { formatMonthTitle, getDayStatus, isSameMonth } from "@/utils/booking/bookingWidgetCalendar";
import { CalendarLegend } from "./CalendarLegend";

export function DayStep({
  availabilityByDate,
  calendarDates,
  calendarMonth,
  courtId,
  date,
  initialDate,
  loadingTimeStep,
  selectedStatus,
  onChooseDate,
  onContinue,
  onNextMonth,
  onPreviousMonth,
}: {
  availabilityByDate: AvailabilityByDate;
  calendarDates: string[];
  calendarMonth: string;
  courtId: string;
  date: string;
  initialDate: string;
  loadingTimeStep: boolean;
  selectedStatus: DayStatus;
  onChooseDate: (value: string) => void;
  onContinue: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-3">
          <button
            aria-label="Previous month"
            className="menu-icon-button cursor-pointer"
            type="button"
            onClick={onPreviousMonth}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
            {formatMonthTitle(calendarMonth)}
          </p>
          <button
            aria-label="Next month"
            className="menu-icon-button cursor-pointer"
            type="button"
            onClick={onNextMonth}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <span
              key={`${day}-${index}`}
              className="py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-zinc-600"
            >
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDates.map((item) => {
            const active = item === date;
            const inMonth = isSameMonth(item, calendarMonth);
            const status = getDayStatus(
              item,
              initialDate,
              availabilityByDate[item]?.[courtId],
            );
            const disabled = !inMonth || status !== "available";
            return (
              <button
                key={item}
                className={[
                  "relative cursor-pointer aspect-square rounded-xl border p-1 text-center transition",
                  active && status === "available"
                    ? "border-white/80 bg-white/[0.12] text-white shadow-[0_0_20px_rgba(255,255,255,0.16)]"
                    : !inMonth
                      ? "border-transparent text-zinc-800"
                      : status === "full"
                        ? "border-red-400/20 bg-red-500/[0.16] text-red-100/70"
                        : status === "unavailable"
                          ? "border-white/5 bg-white/[0.02] text-zinc-700"
                          : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/45 hover:bg-white/[0.06]",
                ].join(" ")}
                disabled={disabled}
                type="button"
                onClick={() => onChooseDate(item)}
              >
                <span className="text-sm font-bold">
                  {Number(item.slice(-2))}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <CalendarLegend label="Available" tone="available" />
        <CalendarLegend label="Full" tone="full" />
        <CalendarLegend label="Unavailable" tone="unavailable" />
      </div>

      <button
        className="premium-button font-display cursor-pointer mt-7 h-14 w-full rounded-xl px-6 text-xs font-black uppercase tracking-[0.28em]"
        disabled={selectedStatus !== "available" || loadingTimeStep}
        type="button"
        onClick={onContinue}
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
