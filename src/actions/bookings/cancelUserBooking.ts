"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function cancelUserBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  if (!bookingId) return { ok: false, error: "Booking is missing." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in before cancelling." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      review_reason: "Cancelled by customer.",
    })
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .eq("status", "PENDING_REVIEW")
    .select("id");

  if (error) {
    return { ok: false, error: "Unable to cancel this booking." };
  }

  if (!data?.length) {
    return {
      ok: false,
      error: "Only pending bookings can be cancelled here.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}
