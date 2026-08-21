"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminMutationLockError } from "@/utils/admin/getAdminMutationLockError";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";

const updateBookingPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  additionalAmount: z.coerce.number().int().positive().optional(),
  markFullyPaid: z.coerce.boolean().default(false),
});

type PaymentUpdateRow = {
  amount_paid: number;
  total_amount: number;
  payment_status: "PAID" | "HALF_PAID" | "UNPAID";
};

export async function updateBookingPayment(formData: FormData) {
  const adminUser = await requireAdmin();
  if (!adminUser?.email) return { ok: false, error: "Unauthorized." };

  const lockError = getAdminMutationLockError();
  if (lockError) return { ok: false, error: lockError };

  const markFullyPaid = formData.get("markFullyPaid") === "true";
  const additionalAmountValue = String(formData.get("additionalAmount") || "").trim();
  const parsed = updateBookingPaymentSchema.safeParse({
    bookingId: formData.get("bookingId"),
    additionalAmount: additionalAmountValue
      ? additionalAmountValue
      : undefined,
    markFullyPaid,
  });

  if (!parsed.success || (!parsed.data.additionalAmount && !markFullyPaid)) {
    return { ok: false, error: "Enter a valid additional payment amount." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("add_booking_group_payment", {
    p_additional_amount: parsed.data.additionalAmount || 0,
    p_booking_id: parsed.data.bookingId,
    p_mark_fully_paid: markFullyPaid,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("booking_payment_not_updatable")) {
      return { ok: false, error: "This booking can no longer be updated." };
    }
    if (message.includes("booking_already_fully_paid")) {
      return { ok: false, error: "This booking is already fully paid." };
    }
    if (message.includes("booking_payment_exceeds_balance")) {
      return { ok: false, error: "The payment exceeds the remaining balance." };
    }
    if (message.includes("add_booking_group_payment")) {
      return {
        ok: false,
        error: "Payment updates are not installed yet. Run the payment update migration.",
      };
    }
    return { ok: false, error: "Unable to update this payment." };
  }

  const updated = (Array.isArray(data) ? data[0] : data) as
    | PaymentUpdateRow
    | null;
  if (!updated) return { ok: false, error: "This booking can no longer be updated." };

  revalidatePath("/");
  revalidatePath("/admin");
  return {
    ok: true,
    amountPaid: updated.amount_paid,
    totalAmount: updated.total_amount,
    paymentStatus: updated.payment_status,
  };
}
