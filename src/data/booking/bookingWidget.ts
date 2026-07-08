import type { BookingStep } from "@/types/bookingWidget";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const stepMeta: Record<BookingStep, { count: string; title: string }> = {
  court: { count: "1 / 4", title: "Choose Court" },
  day: { count: "2 / 4", title: "Choose Day" },
  time: { count: "3 / 4", title: "Choose Time" },
  payment: { count: "4 / 4", title: "Payment" },
  submitted: { count: "Done", title: "Success" },
};
