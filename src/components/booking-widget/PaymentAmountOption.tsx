

export function PaymentAmountOption({
  active,
  label,
  onClick,
  value,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      className={[
        "rounded-2xl cursor-pointer border p-4 text-left transition",
        active
          ? "border-white/80 bg-white/[0.12] text-white shadow-[0_0_24px_rgba(255,255,255,0.14)]"
          : "border-white/10 bg-white/[0.04] text-white hover:border-white/30",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      <p
        className={
          active
            ? "text-xs uppercase tracking-[0.2em] text-zinc-200"
            : "text-xs uppercase tracking-[0.2em] text-zinc-500"
        }
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </button>
  );
}
