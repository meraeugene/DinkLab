import { z } from "zod";

export const bookingBackupRowSchema = z
  .object({
    id: z.string().uuid(),
    booking_group_id: z.string().uuid(),
    court_id: z.string().uuid(),
    user_id: z.string().uuid().nullable(),
    user_email: z.string().nullable(),
    customer_name: z.string().min(1),
    customer_avatar_url: z.string().nullable(),
    customer_contact: z.string(),
    start_at: z.string().min(1),
    end_at: z.string().min(1),
    hourly_rate: z.number().int().positive(),
    total_amount: z.number().int().positive(),
    downpayment_amount: z.number().int().nonnegative(),
    payment_method: z.enum(["BPI", "GOTYME", "ONSITE"]),
    payment_status: z.enum(["PAID", "HALF_PAID", "UNPAID", "UNVERIFIED"]),
    payment_reference: z.string().nullable(),
    payment_proof_url: z.string().nullable(),
    payment_proof_public_id: z.string().nullable(),
    status: z.enum(["PENDING_REVIEW", "ACCEPTED", "CANCELLED", "REJECTED"]),
    accepted_at: z.string().nullable(),
    cancelled_at: z.string().nullable(),
    reviewed_at: z.string().nullable(),
    reviewed_by_email: z.string().nullable(),
    review_reason: z.string().nullable(),
    reminder_sent_at: z.string().nullable(),
    reminder_email_error: z.string().nullable(),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
  })
  .strict();

export const bookingBackupSchema = z
  .object({
    format: z.literal("dinklab-bookings"),
    version: z.literal(1),
    generatedAt: z.string().min(1),
    bookings: z.array(bookingBackupRowSchema).max(50_000),
  })
  .strict();

export type BookingBackup = z.infer<typeof bookingBackupSchema>;
export type BookingBackupRow = z.infer<typeof bookingBackupRowSchema>;

export type BookingRestoreResponse = {
  ok: boolean;
  error?: string;
  mode?: "preview" | "restore";
  backupCount?: number;
  existingCount?: number;
  restorableCount?: number;
  restoredCount?: number;
  skippedCount?: number;
  generatedAt?: string;
  warnings?: string[];
};
