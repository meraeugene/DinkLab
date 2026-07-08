import { ArrowRight, Check } from "lucide-react";
import type { CourtOption } from "@/types/bookingSettings";
import { CourtMiniGraphic } from "./CourtMiniGraphic";

export function CourtStep({
  courtId,
  courts,
  onChooseCourt,
  onContinue,
}: {
  courtId: string;
  courts: CourtOption[];
  onChooseCourt: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="grid gap-4">
        {courts.map((court) => {
          const active = court.id === courtId;

          return (
            <button
              key={court.id}
              className={[
                "relative cursor-pointer flex min-h-32 items-center gap-5 rounded-2xl border p-3 text-left transition sm:gap-6 sm:p-4",
                active
                  ? "border-white/80 bg-white/[0.08] shadow-[0_0_28px_rgba(255,255,255,0.16),inset_0_0_26px_rgba(255,255,255,0.08)]"
                  : "border-white/15 bg-white/[0.025] hover:border-white/35 hover:bg-white/[0.05]",
              ].join(" ")}
              type="button"
              onClick={() => onChooseCourt(court.id)}
            >
              <CourtMiniGraphic />
              <span>
                <span className="block text-lg tracking-wider font-semibold font-display uppercase text-white">
                  {court.name}
                </span>
                <span className="text-sm text-zinc-400">
                  {formatCourtType(court.description)}
                </span>
              </span>
              {active ? (
                <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-white text-black">
                  <Check className="h-4 w-4" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        className="premium-button font-display mt-7 h-14 w-full rounded-xl cursor-pointer px-6 text-xs font-black uppercase tracking-[0.28em]"
        type="button"
        onClick={onContinue}
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function formatCourtType(value: string | null) {
  return value?.toLowerCase().includes("outdoor") ? "Outdoor" : "Indoor";
}
