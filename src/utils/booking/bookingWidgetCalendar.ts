import { formatPeso, getHourlyRate } from "@/lib/pricing";
import {
  type CourtSlot,
  formatSlotLabel,
  getOperatingHours,
  manilaHourToUtc,
} from "@/lib/time";
import type { DayStatus } from "@/types/bookingWidget";

const OPERATING_HOURS = getOperatingHours();

export function addMonths(month: string, offset: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthIndex - 1 + offset, 1));
  return next.toISOString().slice(0, 7);
}

export function buildCalendarDates(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthIndex - 1, 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setUTCDate(start.getUTCDate() + index);
    return value.toISOString().slice(0, 10);
  });
}

export function formatMonthTitle(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}

export function isSameMonth(date: string, month: string) {
  return date.startsWith(month);
}

export function getDayStatus(
  date: string,
  initialDate: string,
  slots?: CourtSlot[],
): DayStatus {
  if (date < initialDate) return "unavailable";
  if (!slots) return "available";
  const futureSlots = slots.filter(
    (slot) => new Date(slot.startAt).getTime() > Date.now(),
  );
  if (!futureSlots.length) return "unavailable";
  return futureSlots.every((slot) => !slot.available) ? "full" : "available";
}

export function getDisplaySlots(date: string, slots?: CourtSlot[]) {
  return slots?.length
    ? [...slots].sort((a, b) => a.startHour - b.startHour)
    : mergeSlots(date, []);
}

export async function fetchAvailabilitySlots(date: string, courtId: string) {
  const params = new URLSearchParams({
    date,
    courtId,
    t: String(Date.now()),
  });
  const response = await fetch(`/api/availability?${params.toString()}`, {
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Unable to load availability.");
  }

  if (!Array.isArray(data?.slots)) {
    throw new Error("Availability response is incomplete.");
  }

  return [...data.slots].sort(
    (a: CourtSlot, b: CourtSlot) => a.startHour - b.startHour,
  );
}

export function buildUnavailableSlots(date: string) {
  return buildCanonicalSlots(date).map((slot) => ({
    ...slot,
    available: false,
  }));
}

export function mergeSlots(date: string, slots: CourtSlot[]) {
  const byHour = new Map(slots.map((slot) => [slot.startHour, slot]));
  return buildCanonicalSlots(date).map((slot) => {
    const apiSlot = byHour.get(slot.startHour);
    return apiSlot
      ? {
          ...slot,
          ...apiSlot,
          occupiedByName: apiSlot.occupiedByName,
          occupiedByAvatarUrl: apiSlot.occupiedByAvatarUrl,
        }
      : slot;
  });
}

export function formatTimeCardLabel(startHour: number) {
  const normalized = startHour % 24;
  const suffix = normalized < 12 ? "AM" : "PM";
  const twelveHour = normalized % 12 || 12;
  return `${twelveHour}:00 ${suffix}`;
}

export function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "P";
}

export function groupSlotsByRate(slots: CourtSlot[]) {
  const groups: { label: string; rate: number; slots: CourtSlot[] }[] = [];

  for (const slot of slots) {
    let group = groups.find((item) => item.rate === slot.rate);
    if (!group) {
      group = { label: `${formatPeso(slot.rate)}/hr`, rate: slot.rate, slots: [] };
      groups.push(group);
    }
    group.slots.push(slot);
  }

  return groups.filter((group) => group.slots.length);
}

export function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  }).format(dateToUtc(date));
}

export { formatPeso };

function buildCanonicalSlots(date: string) {
  const now = Date.now();
  return OPERATING_HOURS.map((hour) => {
    const start = manilaHourToUtc(date, hour);
    const end = manilaHourToUtc(date, hour + 1);

    return {
      startHour: hour,
      label: formatSlotLabel(hour),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      available: start.getTime() > now,
      rate: getHourlyRate(hour),
    };
  });
}

function dateToUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
