import { ArrowLeft, X } from "lucide-react";
import { stepMeta } from "@/data/booking/bookingWidget";
import type { BookingStep } from "@/types/bookingWidget";
import { formatLongDate } from "@/utils/booking/bookingWidgetCalendar";

export function BookingTopBar({
  step,
  selectedDate,
  selectedCourt,
  onBack,
  onClose,
}: {
  step: BookingStep;
  selectedDate?: string;
  selectedCourt?: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const index =
    step === "court" ? 1 : step === "day" ? 2 : step === "time" ? 3 : 4;
  const progress = step === "submitted" ? 100 : (index / 4) * 100;

  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between gap-3">
        <button
          aria-label="Go back"
          className={[
            "menu-icon-button cursor-pointer",
            step === "court" || step === "submitted"
              ? "pointer-events-none opacity-0"
              : "",
          ].join(" ")}
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
          {selectedDate || selectedCourt ? (
            <p className="mt-1 text-xs font-semibold text-zinc-400">
              {selectedDate ? formatLongDate(selectedDate) : null}
              {selectedDate && selectedCourt ? (
                <span aria-hidden="true"> · </span>
              ) : null}
              {selectedCourt}
            </p>
          ) : null}
        </div>
        <button
          aria-label="Close booking"
          className="menu-icon-button cursor-pointer"
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
