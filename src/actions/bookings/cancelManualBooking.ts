"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";

export async function cancelManualBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  const reason = String(formData.get("reason") || "").trim();
  const adminUser = await requireAdmin();
  if (!bookingId || !adminUser) return { ok: false, error: "Unauthorized." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({
      status: "REJECTED",
      cancelled_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by_email: adminUser.email,
      review_reason: reason || "Booking was rejected by admin.",
    })
    .eq("id", bookingId)
    .eq("status", "PENDING_REVIEW");

  revalidatePath("/admin");
  revalidatePath("/");
  return error
    ? { ok: false, error: "Unable to reject booking." }
    : { ok: true };
}
