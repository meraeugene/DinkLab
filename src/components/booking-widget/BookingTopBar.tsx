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
  const desktopTitle =
    step === "payment" ? "Complete Booking" : "Booking Submitted";

  return (
    <div className={step === "schedule" ? "shrink-0 lg:hidden" : "shrink-0"}>
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <button
          aria-label="Go back"
          className={[
            "menu-icon-button cursor-pointer",
            disabled || step === "schedule" || step === "submitted"
              ? "pointer-events-none opacity-0 lg:!hidden"
              : "",
          ].join(" ")}
          disabled={disabled}
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center lg:text-left">
          <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-zinc-500 lg:hidden">
            {stepMeta[step].count}
          </p>
          <h3 className="font-display mt-1 text-xl font-black lg:hidden">
            {stepMeta[step].title}
          </h3>
          <h3 className="hidden font-display text-3xl font-black uppercase tracking-[0.1em] lg:block xl:text-4xl">
            {desktopTitle}
          </h3>
          {selectedDate ? (
            <p className="mt-1 text-xs font-semibold text-zinc-400 lg:hidden">
              {formatLongDate(selectedDate)}
            </p>
          ) : null}
        </div>
        {step === "payment" ? (
          <span
            aria-hidden="true"
            className="menu-icon-button invisible lg:!hidden"
          />
        ) : (
          <button
            aria-label="Close booking"
            className="menu-icon-button cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 lg:!hidden"
            disabled={disabled}
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10 lg:hidden">
        <div
          className="h-full rounded-full bg-white transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
