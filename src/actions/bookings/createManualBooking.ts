"use server";

import { revalidatePath } from "next/cache";
import {
  getHourlyRateFromBands,
  getPromoHourlyRate,
  isBeforeBookingOpeningDate,
} from "@/lib/pricing";
import { manualBookingSchema } from "@/actions/bookings/schemas/manualBookingSchema";
import { buildSlot } from "@/utils/booking/bookingAvailability";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";
import { getUserAvatarUrl } from "@/utils/users/getUserAvatarUrl";
import { isMissingAvatarColumn } from "@/utils/supabase/isMissingAvatarColumn";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { PaymentErrors } from "@/types/bookingWidget";

export async function createManualBooking(formData: FormData) {
  let selections: unknown = [];
  try {
    selections = JSON.parse(String(formData.get("selections") || "[]"));
  } catch {
    return { error: "The selected times are invalid. Please choose them again." };
  }

  const parsed = manualBookingSchema.safeParse({
    date: formData.get("date"),
    selections,
    holdToken: formData.get("holdToken"),
    customerName: formData.get("customerName"),
    customerContact: formData.get("customerContact"),
    customerEmail: formData.get("customerEmail") || undefined,
    paymentMethod: formData.get("paymentMethod"),
    paymentAmountMode: formData.get("paymentAmountMode"),
    referenceNumber: formData.get("referenceNumber") || undefined,
    paymentProofUrl: formData.get("paymentProofUrl") || undefined,
    paymentProofPublicId: formData.get("paymentProofPublicId") || undefined,
  });

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    const fieldErrors: PaymentErrors = {
      contact: fields.customerContact?.[0],
      email: fields.customerEmail?.[0],
      name: fields.customerName?.[0],
      proof:
        fields.paymentProofUrl?.[0] || fields.paymentProofPublicId?.[0],
    };
    return {
      error:
        parsed.error.issues[0]?.message ||
        "Please complete the booking details before submitting.",
      fieldErrors,
    };
  }

  const normalizedSelections = parsed.data.selections.map((selection) => ({
    courtId: normalizeCourtId(selection.courtId),
    startHour: selection.startHour,
  }));
  if (normalizedSelections.some((selection) => !selection.courtId)) {
    return { error: "Select a valid court before booking." };
  }
  const uniqueSelections = new Set(
    normalizedSelections.map((selection) => `${selection.courtId}:${selection.startHour}`),
  );
  if (uniqueSelections.size !== normalizedSelections.length) {
    return { error: "A selected court and time was duplicated." };
  }

  const referenceNumber = parsed.data.referenceNumber?.trim() || null;
  const paymentProofUrl = parsed.data.paymentProofUrl?.trim() || null;
  const paymentProofPublicId = parsed.data.paymentProofPublicId?.trim() || null;

  if (!paymentProofUrl || !paymentProofPublicId) {
    return { error: "Upload a screenshot of your payment before booking." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Choose guest or Google access before submitting your booking.",
    };
  }

  const rules = await getBusinessRules();

  if (normalizedSelections.some(
    (selection) =>
      selection.startHour < rules.settings.openHour ||
      selection.startHour >= rules.settings.closeHour,
  )) {
    return { error: "Please choose a time during operating hours." };
  }

  if (isBeforeBookingOpeningDate(parsed.data.date)) {
    return { error: "Bookings open on July 26, 2026." };
  }

  const selectedSlots = normalizedSelections
    .map((selection) => {
      const hourlyRate = getPromoHourlyRate(
        parsed.data.date,
        selection.startHour,
        getHourlyRateFromBands(selection.startHour, rules.pricingBands),
      );
      return {
        courtId: selection.courtId!,
        hourlyRate,
        slot: buildSlot(parsed.data.date, selection.startHour, true, hourlyRate),
      };
    })
    .sort(
      (first, second) =>
        first.courtId.localeCompare(second.courtId) ||
        first.slot.startAt.localeCompare(second.slot.startAt),
    );
  if (selectedSlots.some(({ slot }) => new Date(slot.startAt).getTime() <= Date.now())) {
    return { error: "Please choose a future slot." };
  }

  const admin = createAdminClient();
  const courtIds = [...new Set(selectedSlots.map((selection) => selection.courtId))];
  const { data: selectedCourts } = await admin
    .from("courts")
    .select("id")
    .in("id", courtIds);

  if ((selectedCourts || []).length !== courtIds.length) {
    return { error: "Select a valid court before booking." };
  }

  const { data: heldSlots, error: holdError } = await admin
    .from("booking_holds")
    .select("court_id,start_at,end_at")
    .eq("hold_token", parsed.data.holdToken)
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString());
  const heldSlotKeys = new Set(
    (heldSlots || []).map(
      (slot) =>
        `${slot.court_id}:${new Date(slot.start_at).toISOString()}:${new Date(slot.end_at).toISOString()}`,
    ),
  );
  const ownsEveryHold = selectedSlots.every(({ courtId, slot }) =>
    heldSlotKeys.has(`${courtId}:${slot.startAt}:${slot.endAt}`),
  );
  if (holdError) {
    const message = holdError.message.toLowerCase();
    if (message.includes("booking_holds") || message.includes("column")) {
      return {
        error: "Booking holds are not installed yet. Run the latest Supabase migration.",
      };
    }
  }
  if (holdError || heldSlotKeys.size !== selectedSlots.length || !ownsEveryHold) {
    return {
      error: "Your slot hold expired. Please select the times again before paying.",
    };
  }

  const customerName = parsed.data.customerName;
  const customerAvatarUrl = getUserAvatarUrl(user);
  const bookingGroupId = crypto.randomUUID();

  const bookingPayload = selectedSlots.map(({ courtId, hourlyRate, slot }) => ({
    booking_group_id: bookingGroupId,
    booking_hold_token: parsed.data.holdToken,
    court_id: courtId,
    user_id: user.id,
    user_email: parsed.data.customerEmail || user.email || null,
    customer_name: customerName,
    customer_avatar_url: customerAvatarUrl,
    customer_contact: parsed.data.customerContact,
    start_at: slot.startAt,
    end_at: slot.endAt,
    hourly_rate: hourlyRate,
    total_amount: hourlyRate,
    downpayment_amount:
      parsed.data.paymentAmountMode === "FULL" ? hourlyRate : hourlyRate / 2,
    payment_method: parsed.data.paymentMethod,
    payment_reference: referenceNumber,
    payment_proof_url: paymentProofUrl,
    payment_proof_public_id: paymentProofPublicId,
    status: "PENDING_REVIEW",
  }));

  let { error: bookingError } = await admin.from("bookings").insert(bookingPayload);

  if (bookingError && isMissingAvatarColumn(bookingError)) {
    const fallbackPayload = bookingPayload.map((payload) => {
      const { customer_avatar_url, ...payloadWithoutAvatar } = payload;
      void customer_avatar_url;
      return payloadWithoutAvatar;
    });
    const fallback = await admin.from("bookings").insert(fallbackPayload);
    bookingError = fallback.error;
  }

  if (bookingError) {
    const message = bookingError.message.toLowerCase();
    if (
      message.includes("booking_hold_expired") ||
      message.includes("booking_slot_conflict") ||
      message.includes("booking_slot_held") ||
      message.includes("exclusion constraint") ||
      message.includes("duplicate key")
    ) {
      return {
        error: "Your slot hold expired or the slot is no longer available. Please select it again.",
      };
    }
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
