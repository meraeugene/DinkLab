export type BookingSettings = {
  openHour: number;
  closeHour: number;
  timezone: string;
};

export type PricingBand = {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  hourlyRate: number;
  sortOrder: number;
  active: boolean;
};

export type CourtOption = {
  id: string;
  name: string;
  description: string | null;
};

export type BusinessRules = {
  settings: BookingSettings;
  pricingBands: PricingBand[];
  courts: CourtOption[];
};
