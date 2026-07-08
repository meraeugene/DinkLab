import type { ReactNode } from "react";

export function AcceptedBookingDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <p className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-zinc-100">{value}</p>
    </div>
  );
}
