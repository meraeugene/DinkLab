
import type { ReactNode } from "react";

export function SummaryRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <span className="flex items-center gap-2 text-zinc-500">
        {icon}
        {label}
      </span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}
