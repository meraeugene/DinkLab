export function PriceCard({
  badge,
  label,
  value,
  detail,
}: {
  badge?: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="shine-card silver-border rounded-2xl bg-white/[0.035] px-3 py-4 shadow-[0_0_36px_rgba(255,255,255,0.06)]">
      <div className="flex flex-wrap  items-center gap-2">
        <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
          {label}
        </p>
        {badge ? (
          <span className="rounded-full border border-amber-200/30 bg-amber-300/15 px-2 py-1 text-[0.58rem] font-black uppercase leading-none tracking-[0.1em] text-amber-100">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-lg font-black text-white sm:text-xl">{value}</p>
      <p className="mt-1 text-xs text-zinc-300">{detail}</p>
    </div>
  );
}
