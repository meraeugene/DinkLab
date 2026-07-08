export function PriceCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="shine-card silver-border rounded-2xl bg-white/[0.035] px-3 py-4 shadow-[0_0_36px_rgba(255,255,255,0.06)]">
      <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white sm:text-xl">{value}</p>
      <p className="mt-1 text-xs text-zinc-300">{detail}</p>
    </div>
  );
}
