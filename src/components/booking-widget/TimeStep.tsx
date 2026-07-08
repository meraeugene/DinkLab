import { Moon, Sun } from "lucide-react";
import type { CourtSlot } from "@/lib/time";
import { formatTimeCardLabel, groupSlotsByRate } from "@/utils/booking/bookingWidgetCalendar";
import { OccupiedAvatar } from "./OccupiedAvatar";

export function TimeStep({
  displaySlots,
  selectedHour,
  validatingSlotHour,
  onChooseSlot,
}: {
  displaySlots: CourtSlot[];
  selectedHour: number | null;
  validatingSlotHour: number | null;
  onChooseSlot: (slot: CourtSlot) => void;
}) {
  return (
    <div>
      <div className="grid gap-5">
        {groupSlotsByRate(displaySlots).map((group) => (
          <div key={group.label}>
            <div className="mb-3 flex items-center gap-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                {group.slots.some((slot) => slot.startHour >= 15) ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                {group.label}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {group.slots.map((slot) => {
                const active = selectedHour === slot.startHour;

                return (
                  <button
                    key={slot.startAt}
                    className={[
                      "relative min-h-20 rounded-xl border p-3 text-center transition",
                      active
                        ? "cursor-pointer border-white/80 bg-white/[0.1] text-white shadow-[0_0_24px_rgba(255,255,255,0.16)]"
                        : slot.available
                          ? "cursor-pointer border-white/15 bg-white/[0.035] text-zinc-100 hover:border-white/55 hover:bg-white/[0.07]"
                          : slot.occupiedByName
                            ? "cursor-not-allowed border-emerald-300/25 bg-emerald-500/[0.09] text-zinc-500"
                            : "cursor-not-allowed border-white/8 bg-white/[0.025] text-zinc-600",
                    ].join(" ")}
                    disabled={!slot.available || validatingSlotHour !== null}
                    type="button"
                    onClick={() => onChooseSlot(slot)}
                  >
                    <span className="block text-lg font-bold leading-none">
                      {formatTimeCardLabel(slot.startHour)}
                    </span>
                    {!slot.available ? (
                      <span className="mt-2 grid gap-1">
                        <span
                          className={[
                            "block text-[0.65rem] font-semibold uppercase tracking-[0.14em]",
                            slot.occupiedByName
                              ? "text-emerald-200/85"
                              : "text-zinc-700",
                          ].join(" ")}
                        >
                          {slot.occupiedByName ? "Reserved" : "Unavailable"}
                        </span>
                        {slot.occupiedByName ? (
                          <span className="mx-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[0.68rem] font-semibold text-zinc-300">
                            <OccupiedAvatar
                              avatarUrl={slot.occupiedByAvatarUrl}
                              name={slot.occupiedByName}
                            />
                            <span className="truncate">
                              {slot.occupiedByName}
                            </span>
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
