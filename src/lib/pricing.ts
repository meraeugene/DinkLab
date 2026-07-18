import type { PricingBand } from "@/types/bookingSettings";

export const EARLY_BIRD_PROMO = {
  label: "Early Bird Promo",
  startDate: "2026-07-26",
  endDate: "2026-07-31",
  startHour: 8,
  endHour: 12,
  hourlyRate: 200,
} as const;

export const BOOKING_OPENING_DATE = EARLY_BIRD_PROMO.startDate;

export const DEFAULT_PRICING_BANDS: PricingBand[] = [
  {
    id: "default-day",
    label: "Day",
    startHour: 8,
    endHour: 16,
    hourlyRate: 250,
    sortOrder: 10,
    active: true,
  },
  {
    id: "default-night",
    label: "Night",
    startHour: 16,
    endHour: 25,
    hourlyRate: 300,
    sortOrder: 20,
    active: true,
  },
];

export function getHourlyRate(startHour: number) {
  return getHourlyRateFromBands(startHour, DEFAULT_PRICING_BANDS);
}

export function getHourlyRateFromBands(
  startHour: number,
  bands: PricingBand[],
) {
  const activeBands = bands.filter((band) => band.active);
  const matchingBand = activeBands.find(
    (band) => startHour >= band.startHour && startHour < band.endHour,
  );

  return matchingBand?.hourlyRate || DEFAULT_PRICING_BANDS.at(-1)!.hourlyRate;
}

export function isEarlyBirdPromoDate(date: string) {
  return date >= EARLY_BIRD_PROMO.startDate && date <= EARLY_BIRD_PROMO.endDate;
}

export function isBookingOpeningDate(date: string) {
  return date === BOOKING_OPENING_DATE;
}

export function isBeforeBookingOpeningDate(date: string) {
  return date < BOOKING_OPENING_DATE;
}

export function isEarlyBirdPromoSlot(date: string, startHour: number) {
  return (
    isEarlyBirdPromoDate(date) &&
    startHour >= EARLY_BIRD_PROMO.startHour &&
    startHour < EARLY_BIRD_PROMO.endHour
  );
}

export function getPromoHourlyRate(
  date: string,
  startHour: number,
  baseRate: number,
) {
  return isEarlyBirdPromoSlot(date, startHour)
    ? EARLY_BIRD_PROMO.hourlyRate
    : baseRate;
}

export function getPromoLabel(date: string, startHour: number) {
  return isEarlyBirdPromoSlot(date, startHour)
    ? EARLY_BIRD_PROMO.label
    : undefined;
}

export function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatHourRange(startHour: number, endHour: number) {
  return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

function formatHour(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized < 12 ? "am" : "pm";
  const twelveHour = normalized % 12 || 12;
  return `${twelveHour}${suffix}`;
}
