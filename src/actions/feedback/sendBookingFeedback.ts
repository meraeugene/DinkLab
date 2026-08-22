"use server";

import { z } from "zod";
import { sendBookingFeedbackEmail } from "@/utils/email/bookingEmail";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const bookingFeedbackSchema = z.object({
  bookingGroupId: z.string().uuid(),
  comment: z.string().trim().max(1000, "Keep your comment under 1,000 characters."),
  rating: z.coerce.number().int().min(1).max(5),
});

export async function sendBookingFeedback(formData: FormData) {
  const parsed = bookingFeedbackSchema.safeParse({
    bookingGroupId: formData.get("bookingGroupId"),
    comment: formData.get("comment") || "",
    rating: formData.get("rating"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ||
        "Choose a star rating and check your comment.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Your booking session has ended." };
  }

  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("customer_name,user_email")
    .eq("booking_group_id", parsed.data.bookingGroupId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !booking) {
    return { ok: false, error: "We could not verify this booking." };
  }

  try {
    await sendBookingFeedbackEmail({
      bookingGroupId: parsed.data.bookingGroupId,
      comment: parsed.data.comment,
      customerEmail: booking.user_email,
      customerName: booking.customer_name,
      rating: parsed.data.rating,
    });
  } catch (emailError) {
    console.error("Unable to send booking feedback email.", emailError);
    return {
      ok: false,
      error: "We could not send your feedback right now. Please try again.",
    };
  }

  return { ok: true };
}
