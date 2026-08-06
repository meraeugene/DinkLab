"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getHourlyRateFromBands,
  getPromoHourlyRate,
} from "@/lib/pricing";
import { manilaHourToUtc } from "@/lib/time";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";
import { createAdminClient } from "@/utils/supabase/admin";

const cancelAcceptedBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().max(300).optional(),
});

const rescheduleSlotSchema = z.object({
  id: z.string().uuid(),
  courtId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.coerce.number().int().min(0).max(28),
  endHour: z.coerce.number().int().min(1).max(29),
});

const rescheduleAcceptedBookingSchema = z.object({
  bookingId: z.string().uuid(),
  slots: z.array(rescheduleSlotSchema).min(1).max(40),
});

type RescheduleReplacement = {
  id: string;
  court_id: string;
  start_at: string;
  end_at: string;
  hourly_rate: number;
  total_amount: number;
  downpayment_amount: number;
};

export async function cancelAcceptedBooking(formData: FormData) {
  const parsed = cancelAcceptedBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason") || undefined,
  });
  const adminUser = await requireAdmin();
  if (!parsed.success || !adminUser?.email) {
    return { ok: false, error: "Unauthorized or invalid cancellation request." };
  }

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from("bookings")
    .select("booking_group_id")
    .eq("id", parsed.data.bookingId)
    .eq("status", "ACCEPTED")
    .maybeSingle();
  if (targetError || !target?.booking_group_id) {
    return { ok: false, error: "This reservation can no longer be cancelled." };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("bookings")
    .update({
      status: "CANCELLED",
      cancelled_at: now,
      reviewed_at: now,
      reviewed_by_email: adminUser.email,
      review_reason:
        parsed.data.reason || "Accepted reservation cancelled manually by admin.",
    })
    .eq("booking_group_id", target.booking_group_id)
    .eq("status", "ACCEPTED")
    .select("id");

  if (error || !data?.length) {
    return { ok: false, error: "Unable to cancel this reservation." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function rescheduleAcceptedBooking(formData: FormData) {
  let slots: unknown = [];
  try {
    slots = JSON.parse(String(formData.get("slots") || "[]"));
  } catch {
    return { ok: false, error: "The replacement schedule is invalid." };
  }

  const parsed = rescheduleAcceptedBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    slots,
  });
  const adminUser = await requireAdmin();
  if (!parsed.success || !adminUser?.email) {
    return { ok: false, error: "Unauthorized or invalid reschedule request." };
  }

  const normalizedSlots = parsed.data.slots.map((slot) => ({
    ...slot,
    courtId: normalizeCourtId(slot.courtId),
  }));
  if (normalizedSlots.some((slot) => !slot.courtId)) {
    return { ok: false, error: "Select a valid court for every schedule item." };
  }
  if (new Set(normalizedSlots.map((slot) => slot.id)).size !== normalizedSlots.length) {
    return { ok: false, error: "A schedule item was submitted more than once." };
  }

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from("bookings")
    .select("booking_group_id")
    .eq("id", parsed.data.bookingId)
    .eq("status", "ACCEPTED")
    .maybeSingle();

  if (targetError || !target?.booking_group_id) {
    return { ok: false, error: "This reservation can no longer be rescheduled." };
  }

  const [{ data: currentSlots, error: currentSlotsError }, rules] =
    await Promise.all([
      admin
        .from("bookings")
        .select("id,total_amount,downpayment_amount,payment_status")
        .eq("booking_group_id", target.booking_group_id)
        .eq("status", "ACCEPTED"),
      getBusinessRules(),
    ]);

  if (currentSlotsError || !currentSlots?.length) {
    return { ok: false, error: "This reservation can no longer be rescheduled." };
  }
  const currentSlotIds = new Set(currentSlots.map((slot) => slot.id));
  if (
    normalizedSlots.length < currentSlotIds.size ||
    currentSlots.some(
      (currentSlot) =>
        !normalizedSlots.some((slot) => slot.id === currentSlot.id),
    )
  ) {
    return { ok: false, error: "The reservation changed. Refresh and try again." };
  }

  const courtIds = [
    ...new Set(normalizedSlots.map((slot) => slot.courtId as string)),
  ];
  const { data: courts, error: courtsError } = await admin
    .from("courts")
    .select("id")
    .in("id", courtIds);
  if (courtsError || courts?.length !== courtIds.length) {
    return { ok: false, error: "One of the selected courts does not exist." };
  }

  const currentSlotsById = new Map(currentSlots.map((slot) => [slot.id, slot]));
  const replacements: Array<RescheduleReplacement | { error: string }> =
    normalizedSlots.map((slot) => {
      if (
        slot.startHour < rules.settings.openHour ||
        slot.endHour > rules.settings.closeHour ||
        slot.endHour <= slot.startHour
      ) {
        return {
          error: "Choose start and end times within operating hours.",
        } as const;
      }

      const startAt = manilaHourToUtc(slot.date, slot.startHour);
      const endAt = manilaHourToUtc(slot.date, slot.endHour);
      if (startAt.getTime() <= Date.now()) {
        return {
          error: "Choose future dates and times for every schedule item.",
        } as const;
      }

      const rates = Array.from(
        { length: slot.endHour - slot.startHour },
        (_, index) => slot.startHour + index,
      ).map((hour) =>
        getPromoHourlyRate(
          slot.date,
          hour,
          getHourlyRateFromBands(hour, rules.pricingBands),
        ),
      );
      const totalAmount = rates.reduce((total, rate) => total + rate, 0);
      const currentSlot = currentSlotsById.get(slot.id) || currentSlots[0];

      return {
        id: slot.id,
        court_id: slot.courtId!,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        hourly_rate: rates[0],
        total_amount: totalAmount,
        downpayment_amount: getRecalculatedPaymentAmount(
          currentSlot,
          totalAmount,
        ),
      };
    });
  const invalidReplacement = replacements.find(
    (replacement) => "error" in replacement,
  );
  if (invalidReplacement && "error" in invalidReplacement) {
    return { ok: false, error: invalidReplacement.error };
  }

  const validReplacements = replacements.filter(
    (replacement): replacement is RescheduleReplacement =>
      !("error" in replacement),
  );
  const hasInternalOverlap = validReplacements.some((slot, index) =>
    validReplacements.slice(index + 1).some(
      (otherSlot) =>
        slot.court_id === otherSlot.court_id &&
        new Date(slot.start_at).getTime() < new Date(otherSlot.end_at).getTime() &&
        new Date(slot.end_at).getTime() > new Date(otherSlot.start_at).getTime(),
    ),
  );
  if (hasInternalOverlap) {
    return { ok: false, error: "Two replacement items overlap on the same court." };
  }

  const { data, error } = await admin.rpc(
    "reschedule_accepted_booking_group",
    {
      p_booking_id: parsed.data.bookingId,
      p_slots: validReplacements,
      p_reviewed_by_email: adminUser.email,
    },
  );

  if (error) {
    const message = error.message.toLowerCase();
    if (
      error.code === "23P01" ||
      error.code === "23505" ||
      message.includes("booking_slot")
    ) {
      return {
        ok: false,
        error: "One of those replacement slots is already booked or temporarily held.",
      };
    }
    if (message.includes("reschedule_slots_overlap")) {
      return { ok: false, error: "Two replacement items overlap on the same court." };
    }
    if (
      message.includes("reschedule_slot_set_changed") ||
      message.includes("booking_not_reschedulable")
    ) {
      return { ok: false, error: "The reservation changed. Refresh and try again." };
    }
    if (message.includes("reschedule_accepted_booking_group")) {
      return {
        ok: false,
        error: "Bulk rescheduling is not installed yet. Run the latest Supabase migration.",
      };
    }
    return { ok: false, error: "Unable to reschedule this reservation." };
  }
  if (data !== validReplacements.length) {
    return { ok: false, error: "This reservation changed before it could be moved." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return {
    ok: true,
    totalAmount: validReplacements.reduce(
      (total, slot) => total + slot.total_amount,
      0,
    ),
  };
}

function getRecalculatedPaymentAmount(
  slot: {
    downpayment_amount: number;
    payment_status: string;
    total_amount: number;
  },
  nextTotalAmount: number,
) {
  if (slot.payment_status === "PAID") return nextTotalAmount;
  if (slot.payment_status === "HALF_PAID") return Math.round(nextTotalAmount / 2);
  if (slot.payment_status === "UNPAID") return 0;

  const previousRatio = slot.total_amount
    ? slot.downpayment_amount / slot.total_amount
    : 0;
  return Math.round(nextTotalAmount * Math.min(1, Math.max(0, previousRatio)));
}
