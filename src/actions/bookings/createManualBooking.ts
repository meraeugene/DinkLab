"use server";

import { revalidatePath } from "next/cache";
import {
  getHourlyRate,
  getPromoHourlyRate,
  isBeforeBookingOpeningDate,
} from "@/lib/pricing";
import { manualBookingSchema } from "@/actions/bookings/schemas/manualBookingSchema";
import { buildSlot, hasSlotConflict, isKnownCourt } from "@/utils/booking/bookingAvailability";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";
import { getUserAvatarUrl } from "@/utils/users/getUserAvatarUrl";
import { getUserDisplayName } from "@/utils/users/getUserDisplayName";
import { isMissingAvatarColumn } from "@/utils/supabase/isMissingAvatarColumn";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function createManualBooking(formData: FormData) {
  const parsed = manualBookingSchema.safeParse({
    date: formData.get("date"),
    courtId: formData.get("courtId"),
    startHour: formData.get("startHour"),
    customerName: formData.get("customerName"),
    customerContact: formData.get("customerContact"),
    paymentMethod: formData.get("paymentMethod"),
    paymentAmountMode: formData.get("paymentAmountMode"),
    referenceNumber: formData.get("referenceNumber") || undefined,
    paymentProofUrl: formData.get("paymentProofUrl") || undefined,
    paymentProofPublicId: formData.get("paymentProofPublicId") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ||
        "Please complete the booking details before submitting.",
    };
  }

  const courtId = normalizeCourtId(parsed.data.courtId);

  if (!courtId || !isKnownCourt(courtId)) {
    return { error: "Select a valid court before booking." };
  }

  const referenceNumber = parsed.data.referenceNumber?.trim() || null;
  const paymentProofUrl = parsed.data.paymentProofUrl?.trim() || null;
  const paymentProofPublicId = parsed.data.paymentProofPublicId?.trim() || null;

  if (
    parsed.data.paymentMethod !== "ONSITE" &&
    !referenceNumber &&
    !paymentProofUrl
  ) {
    return { error: "Add a reference number or upload a payment image." };
  }

  if (paymentProofUrl && !paymentProofPublicId) {
    return { error: "Payment image upload is incomplete." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      error: "Please sign in with Google before submitting your booking.",
    };
  }

  const rules = await getBusinessRules();

  if (
    parsed.data.startHour < rules.settings.openHour ||
    parsed.data.startHour >= rules.settings.closeHour
  ) {
    return { error: "Please choose a time during operating hours." };
  }

  if (isBeforeBookingOpeningDate(parsed.data.date)) {
    return { error: "Bookings open on July 26, 2026." };
  }

  const hourlyRate = getPromoHourlyRate(
    parsed.data.date,
    parsed.data.startHour,
    getHourlyRate(parsed.data.startHour),
  );
  const slot = buildSlot(
    parsed.data.date,
    parsed.data.startHour,
    true,
    hourlyRate,
  );
  if (new Date(slot.startAt).getTime() <= Date.now()) {
    return { error: "Please choose a future slot." };
  }

  const admin = createAdminClient();
  const { data: selectedCourt } = await admin
    .from("courts")
    .select("id")
    .eq("id", courtId)
    .maybeSingle();

  if (!selectedCourt) {
    return { error: "Select a valid court before booking." };
  }

  if (await hasSlotConflict(courtId, slot.startAt, slot.endAt)) {
    return {
      error: "That slot was just accepted. Please choose another time.",
    };
  }

  const paymentAmount =
    parsed.data.paymentAmountMode === "FULL" ? hourlyRate : hourlyRate / 2;
  const customerName = getUserDisplayName(user) || parsed.data.customerName;
  const customerAvatarUrl = getUserAvatarUrl(user);

  const bookingPayload = {
    court_id: courtId,
    user_id: user.id,
    user_email: user.email,
    customer_name: customerName,
    customer_avatar_url: customerAvatarUrl,
    customer_contact: parsed.data.customerContact,
    start_at: slot.startAt,
    end_at: slot.endAt,
    hourly_rate: hourlyRate,
    total_amount: hourlyRate,
    downpayment_amount: paymentAmount,
    payment_method: parsed.data.paymentMethod,
    payment_reference: referenceNumber,
    payment_proof_url: paymentProofUrl,
    payment_proof_public_id: paymentProofPublicId,
    status: "PENDING_REVIEW",
  };

  let { error: bookingError } = await admin.from("bookings").insert(bookingPayload);

  if (bookingError && isMissingAvatarColumn(bookingError)) {
    const fallbackPayload: Partial<typeof bookingPayload> = { ...bookingPayload };
    delete fallbackPayload.customer_avatar_url;
    const fallback = await admin.from("bookings").insert(fallbackPayload);
    bookingError = fallback.error;
  }

  if (bookingError) {
    const message = bookingError.message.toLowerCase();
    if (
      message.includes("payment_method") ||
      message.includes("bookings_payment_proof_required_check") ||
      message.includes("invalid input value for enum") ||
      message.includes("payment_proof") ||
      message.includes("downpayment_amount") ||
      message.includes("violates check constraint") ||
      message.includes("violates not-null constraint") ||
      message.includes("column")
    ) {
      return {
        error:
          "Booking schema is not updated yet. Run the latest Supabase migration, then try again.",
      };
    }
    return {
      error: `Unable to submit booking: ${bookingError.message}`,
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}
