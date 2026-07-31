import { z } from "zod";
import { isKnownCourt } from "@/utils/booking/bookingAvailability";

const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selections: z
    .array(
      z.object({
        courtId: z.string().refine(isKnownCourt, "Select a valid court before booking."),
        startHour: z.coerce.number().int().min(0).max(28),
      }),
    )
    .min(1, "Select at least one available time.")
    .max(40, "Too many times were selected."),
});

export const manualBookingSchema = bookingSchema.extend({
  customerName: z.string().trim().min(2, "Enter your full name.").max(120),
  customerContact: z
    .string()
    .trim()
    .regex(/^\d{7,15}$/, "Enter a valid contact number."),
  paymentMethod: z.literal("GOTYME"),
  paymentAmountMode: z.enum(["HALF", "FULL"]),
  referenceNumber: z.string().trim().max(120).optional(),
  paymentProofUrl: z.string().url().optional(),
  paymentProofPublicId: z.string().trim().max(255).optional(),
});
