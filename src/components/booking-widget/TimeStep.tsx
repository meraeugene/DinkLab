import { Moon, Sun } from "lucide-react";
import type { CourtSlot } from "@/lib/time";
import { formatTimeCardLabel, groupSlotsByRate } from "@/utils/booking/bookingWidgetCalendar";
import { OccupiedAvatar } from "./OccupiedAvatar";

export function TimeStep({
  displaySlots,
  loadingTimeStep,
  selectedHours,
  onChooseSlot,
}: {
  displaySlots: CourtSlot[];
  loadingTimeStep: boolean;
  selectedHours: number[];
  onChooseSlot: (slot: CourtSlot) => void;
}) {
  return (
    <div className="w-full min-w-0">
      {loadingTimeStep ? (
        <TimeStepSkeleton />
      ) : (
      <div className="grid min-w-0 gap-5">
        {groupSlotsByRate(displaySlots).map((group) => (
          <div
            className="min-w-0"
            key={`${group.label}-${group.slots[0]?.startHour}`}
          >
            <div className="mb-3 flex items-center gap-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                {group.slots.some((slot) => slot.startHour >= 15) ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                {formatTimeCardLabel(
                  group.slots[0].startHour,
                  group.slots.at(-1)!.startHour + 1,
                )}
                <span aria-hidden="true">·</span>
                {group.label}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {mergeConsecutiveReservations(group.slots).map((slot) => {
                const active = selectedHours.includes(slot.startHour);

                return (
                  <button
                    key={slot.startAt}
                    className={[
                      "relative min-h-20 min-w-0 overflow-hidden rounded-xl border p-3 text-center transition",
                      active
                        ? "cursor-pointer border-white/80 bg-white/[0.1] text-white shadow-[0_0_24px_rgba(255,255,255,0.16)]"
                        : slot.available
                          ? "cursor-pointer border-white/15 bg-white/[0.035] text-zinc-100 hover:border-white/55 hover:bg-white/[0.07]"
                          : slot.occupiedByName
                            ? "cursor-not-allowed border-emerald-300/25 bg-emerald-500/[0.09] text-zinc-500"
                            : "cursor-not-allowed border-white/8 bg-white/[0.025] text-zinc-600",
                    ].join(" ")}
                    aria-pressed={active}
                    disabled={!slot.available}
                    type="button"
                    onClick={() => onChooseSlot(slot)}
                  >
                    <span className="block text-lg font-bold leading-none">
                      {formatTimeCardLabel(slot.startHour, slot.displayEndHour)}
                    </span>
                    {active ? (
                      <span className="mt-2 block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                        Selected
                      </span>
                    ) : null}
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
                          <span className="mx-auto flex w-full min-w-0 max-w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/35 px-2 py-1.5 text-[0.68rem] font-semibold text-zinc-300">
                            <OccupiedAvatar
                              avatarUrl={slot.occupiedByAvatarUrl}
                              name={slot.occupiedByName}
                            />
                            <span className="min-w-0 whitespace-normal break-words text-left leading-tight">
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
      )}
    </div>
  );
}

function mergeConsecutiveReservations(slots: CourtSlot[]) {
  const merged: Array<CourtSlot & { displayEndHour: number }> = [];

  for (const slot of slots) {
    const previous = merged.at(-1);
    const sameReservation =
      previous?.occupiedByName &&
      slot.occupiedByName &&
      previous.occupiedByName.trim().toLowerCase() ===
        slot.occupiedByName.trim().toLowerCase() &&
      previous.displayEndHour === slot.startHour;

    if (sameReservation) {
      previous.displayEndHour = slot.startHour + 1;
      previous.endAt = slot.endAt;
      continue;
    }

    merged.push({ ...slot, displayEndHour: slot.startHour + 1 });
  }

  return merged;
}

function TimeStepSkeleton() {
  return (
    <div className="grid gap-5" aria-label="Loading available times">
      {["Morning", "Afternoon"].map((group) => (
        <div key={group}>
          <div className="mb-3 h-4 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                aria-hidden="true"
                className="min-h-20 rounded-xl border border-white/10 bg-white/[0.035] p-3"
                key={index}
              >
                <div className="mx-auto mt-1 h-5 w-20 animate-pulse rounded-full bg-white/15" />
                <div className="mx-auto mt-3 h-3 w-14 animate-pulse rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
