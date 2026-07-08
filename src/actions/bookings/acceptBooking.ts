"use server";

import { revalidatePath } from "next/cache";
import { sendAcceptanceEmail } from "@/utils/email/bookingEmail";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";

export async function acceptBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  if (!bookingId || !(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("accept_pending_booking", {
    target_booking_id: bookingId,
  });

  if (error) {
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: false, error: "Unable to accept booking." };
  }

  const acceptedBooking = Array.isArray(data) ? data[0] : null;
  if (acceptedBooking?.conflict) {
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: false, error: "This slot is already reserved." };
  }

  if (!acceptedBooking?.accepted) {
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: false, error: "This booking can no longer be accepted." };
  }

  await sendAcceptanceEmail({
    customerName: acceptedBooking.customer_name,
    to: acceptedBooking.user_email,
    startAt: acceptedBooking.start_at,
    endAt: acceptedBooking.end_at,
    totalAmount: acceptedBooking.total_amount,
    courtName: acceptedBooking.court_name,
  }).catch(() => undefined);

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}
