"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getAdminMutationLockError } from "@/utils/admin/getAdminMutationLockError";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { deletePaymentProofAsset } from "@/utils/cloudinary/paymentProofStorage";
import { createAdminClient } from "@/utils/supabase/admin";

const deleteBookingSchema = z.object({
  bookingId: z.string().uuid(),
  confirmation: z.literal("DELETE BOOKING"),
});

type BookingRow = {
  payment_proof_public_id: string | null;
};

export async function deleteBooking(formData: FormData) {
  const parsed = deleteBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    confirmation: formData.get("confirmation"),
  });
  const adminUser = await requireAdmin();

  if (!parsed.success || !adminUser) {
    return { ok: false, error: "Unauthorized or invalid delete request." };
  }

  const lockError = getAdminMutationLockError();
  if (lockError) return { ok: false, error: lockError };

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from("bookings")
    .select("booking_group_id")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (targetError || !target?.booking_group_id) {
    return { ok: false, error: "This booking no longer exists." };
  }

  const { data: groupRows, error: groupError } = await admin
    .from("bookings")
    .select("payment_proof_public_id")
    .eq("booking_group_id", target.booking_group_id);

  if (groupError || !groupRows?.length) {
    return { ok: false, error: "Unable to load this booking." };
  }

  const { count, error: deleteError } = await admin
    .from("bookings")
    .delete({ count: "exact" })
    .eq("booking_group_id", target.booking_group_id);

  if (deleteError || count !== groupRows.length) {
    return { ok: false, error: "Unable to delete this booking." };
  }

  const publicIds = Array.from(
    new Set(
      (groupRows as BookingRow[])
        .map((row) => row.payment_proof_public_id)
        .filter((publicId): publicId is string => Boolean(publicId)),
    ),
  );
  if (publicIds.length) {
    after(() => Promise.allSettled(publicIds.map(deletePaymentProofAsset)));
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { ok: true, deletedCount: count };
}
