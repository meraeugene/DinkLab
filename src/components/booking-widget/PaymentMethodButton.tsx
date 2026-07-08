

export function PaymentMethodButton({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: "bpi" | "gotyme" | "onsite";
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "inline-flex cursor-pointer h-12 items-center justify-center rounded-xl border px-2 text-xs uppercase font-display tracking-[0.12em] transition sm:h-14 sm:px-4 sm:text-xs sm:tracking-[0.16em]",
        active
          ? tone === "gotyme"
            ? "border-cyan-300/65 bg-cyan-500/20 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.2)]"
            : tone === "bpi"
              ? "border-red-300/65 bg-red-500/20 text-red-50 shadow-[0_0_24px_rgba(239,68,68,0.18)]"
              : "border-white/45 bg-white/[0.12] text-white shadow-[0_0_24px_rgba(255,255,255,0.12)]"
          : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/35 hover:text-white",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
