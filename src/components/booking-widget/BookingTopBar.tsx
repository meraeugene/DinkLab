import { ArrowLeft, X } from "lucide-react";
import { stepMeta } from "@/data/booking/bookingWidget";
import type { BookingStep } from "@/types/bookingWidget";
import { formatLongDate } from "@/utils/booking/bookingWidgetCalendar";

export function BookingTopBar({
  disabled = false,
  step,
  selectedDate,
  onBack,
  onClose,
}: {
  disabled?: boolean;
  step: BookingStep;
  selectedDate?: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const index = step === "schedule" ? 1 : 2;
  const progress = step === "submitted" ? 100 : (index / 2) * 100;

  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between gap-3">
        <button
          aria-label="Go back"
          className={[
            "menu-icon-button cursor-pointer",
            disabled || step === "schedule" || step === "submitted"
              ? "pointer-events-none opacity-0"
              : "",
          ].join(" ")}
          disabled={disabled}
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
            {stepMeta[step].count}
          </p>
          <h3 className="font-display mt-1 text-xl font-black">
            {stepMeta[step].title}
          </h3>
          {selectedDate ? (
            <p className="mt-1 text-xs font-semibold text-zinc-400">
              {formatLongDate(selectedDate)}
            </p>
          ) : null}
        </div>
        <button
          aria-label="Close booking"
          className="menu-icon-button cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          type="button"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
