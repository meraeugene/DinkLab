import type { ReactNode } from "react";

export function PaymentDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="icon-chip h-11 w-11 rounded-xl">{icon}</span>
      <span>
        <span className="block text-xs uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </span>
        <span className="text-lg font-medium text-white">{value}</span>
      </span>
    </div>
  );
}
