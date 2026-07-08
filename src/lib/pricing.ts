import type { PricingBand } from "@/types/bookingSettings";

export const DEFAULT_PRICING_BANDS: PricingBand[] = [
  {
    id: "default-early",
    label: "Early",
    startHour: 8,
    endHour: 12,
    hourlyRate: 150,
    sortOrder: 10,
    active: true,
  },
  {
    id: "default-day",
    label: "Day",
    startHour: 12,
    endHour: 15,
    hourlyRate: 200,
    sortOrder: 20,
    active: true,
  },
  {
    id: "default-night",
    label: "Night",
    startHour: 15,
    endHour: 25,
    hourlyRate: 300,
    sortOrder: 30,
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
