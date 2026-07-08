import type { CourtOption, PricingBand } from "@/types/bookingSettings";
import type { CourtSlot } from "@/lib/time";

export type BookingWidgetProps = {
  signedIn: boolean;
  initialDate: string;
  initialName?: string;
  pricingBands: PricingBand[];
  courts: CourtOption[];
};

export type BookingStep = "court" | "day" | "time" | "payment" | "submitted";
export type Availability = Record<string, CourtSlot[]>;
export type AvailabilityByDate = Record<string, Availability>;
export type DayStatus = "available" | "full" | "unavailable";
export type PaymentMethod = "BPI" | "GOTYME" | "ONSITE";
export type PaymentAmountMode = "HALF" | "FULL";
export type PaymentErrorKey = "contact" | "name" | "proof";
export type PaymentErrors = Partial<Record<PaymentErrorKey, string>>;

export type ProofUpload = {
  fileName: string;
  publicId: string;
  secureUrl: string;
};

export type ToastTone = "error" | "success" | "info";
export type Toast = {
  message: string;
  tone: ToastTone;
} | null;
