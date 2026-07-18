import { MANILA_TIME_ZONE } from "@/data/app/appConfig";

export type CourtSlot = {
  startHour: number;
  label: string;
  startAt: string;
  endAt: string;
  available: boolean;
  rate: number;
  promoLabel?: string;
  occupiedByName?: string;
  occupiedByAvatarUrl?: string;
};

export function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function manilaHourToUtc(date: string, hour: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, 0, 0, 0));
}

export function getOperatingHours(openHour = 8, closeHour = 25) {
  return Array.from(
    { length: Math.max(0, closeHour - openHour) },
    (_, index) => index + openHour,
  );
}

export function formatSlotLabel(startHour: number) {
  const endHour = startHour + 1;
  return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

export function formatManilaDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatHour(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized < 12 ? "am" : "pm";
  const twelveHour = normalized % 12 || 12;
  return `${twelveHour}${suffix}`;
}
