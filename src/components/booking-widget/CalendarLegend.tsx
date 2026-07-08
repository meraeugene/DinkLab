import type { DayStatus } from "@/types/bookingWidget";

export function CalendarLegend({ label, tone }: { label: string; tone: DayStatus }) {
  return (
    <span
      className={[
        "flex items-center justify-center rounded-xl border px-2 py-2",
        tone === "available"
          ? "border-white/20 bg-white/[0.08] text-zinc-200"
          : tone === "full"
            ? "border-red-400/20 bg-red-500/[0.14] text-red-100/70"
            : "border-white/10 bg-white/[0.03] text-zinc-600",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
