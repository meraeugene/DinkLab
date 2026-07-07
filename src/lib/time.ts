import { MANILA_TIME_ZONE } from "@/lib/constants";

export type CourtSlot = {
  startHour: number;
  label: string;
  startAt: string;
  endAt: string;
  available: boolean;
  rate: number;
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

export function getOperatingHours() {
  return Array.from({ length: 17 }, (_, index) => index + 8);
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
