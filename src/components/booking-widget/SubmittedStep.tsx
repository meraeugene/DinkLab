import { BadgeCheck } from "lucide-react";

export function SubmittedStep({ onBackToSite }: { onBackToSite: () => void }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/15 text-emerald-300">
        <BadgeCheck className="h-8 w-8" />
      </div>
      <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-zinc-500">
        Success
      </p>
      <h3 className="font-display hero-shine-text mt-3 text-3xl font-black uppercase">
        Booking Submitted
      </h3>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-zinc-400">
        Your proof was submitted. This slot remains open until admin accepts a
        booking from the dashboard.
      </p>
      <button
        className="premium-button-dark font-display mt-8 h-12 cursor-pointer rounded-xl px-6 text-xs font-black uppercase tracking-[0.24em]"
        type="button"
        onClick={onBackToSite}
      >
        Back to Site
      </button>
    </div>
  );
}
