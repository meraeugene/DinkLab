"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getHourlyRateFromBands,
  getPromoHourlyRate,
} from "@/lib/pricing";
import { manilaHourToUtc } from "@/lib/time";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { hasSlotConflict } from "@/utils/booking/bookingAvailability";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";
import { createAdminClient } from "@/utils/supabase/admin";

const onsiteBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date."),
  courtId: z.string().min(1, "Select a court."),
  startHour: z.coerce.number().int().min(0).max(28),
  endHour: z.coerce.number().int().min(1).max(29),
  customerName: z.string().trim().min(2, "Enter the customer's name.").max(120),
  customerContact: z.string().trim().min(3, "Enter a contact number.").max(30),
  paymentStatus: z.enum(["PAID", "HALF_PAID", "UNPAID"]),
});

export async function createOnsiteBooking(formData: FormData) {
  const adminUser = await requireAdmin();
  if (!adminUser?.email) return { ok: false, error: "Unauthorized." };

  const parsed = onsiteBookingSchema.safeParse({
    date: formData.get("date"),
    courtId: formData.get("courtId"),
    startHour: formData.get("startHour"),
    endHour: formData.get("endHour"),
    customerName: formData.get("customerName"),
    customerContact: formData.get("customerContact"),
    paymentStatus: formData.get("paymentStatus"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Check the booking details." };
  }

  const courtId = normalizeCourtId(parsed.data.courtId);
  if (!courtId) return { ok: false, error: "Select a valid court." };
  if (parsed.data.endHour <= parsed.data.startHour) {
    return { ok: false, error: "End time must be after the start time." };
  }

  const rules = await getBusinessRules();
  if (
    parsed.data.startHour < rules.settings.openHour ||
    parsed.data.endHour > rules.settings.closeHour
  ) {
    return { ok: false, error: "Choose a time within operating hours." };
  }

  const startAt = manilaHourToUtc(parsed.data.date, parsed.data.startHour);
  const endAt = manilaHourToUtc(parsed.data.date, parsed.data.endHour);
  if (startAt.getTime() <= Date.now()) {
    return { ok: false, error: "Choose a future onsite booking time." };
  }

  const admin = createAdminClient();
  const { data: court } = await admin
    .from("courts")
    .select("id")
    .eq("id", courtId)
    .maybeSingle();
  if (!court) return { ok: false, error: "The selected court does not exist." };

  if (await hasSlotConflict(courtId, startAt.toISOString(), endAt.toISOString())) {
    return { ok: false, error: "That court already has an accepted booking during this time." };
  }

  const rates = Array.from(
    { length: parsed.data.endHour - parsed.data.startHour },
    (_, index) => parsed.data.startHour + index,
  ).map((hour) =>
    getPromoHourlyRate(
      parsed.data.date,
      hour,
      getHourlyRateFromBands(hour, rules.pricingBands),
    ),
  );
  const totalAmount = rates.reduce((sum, rate) => sum + rate, 0);
  const downpaymentAmount =
    parsed.data.paymentStatus === "PAID"
      ? totalAmount
      : parsed.data.paymentStatus === "HALF_PAID"
        ? totalAmount / 2
        : 0;
  const now = new Date().toISOString();

  const { error } = await admin.from("bookings").insert({
    court_id: courtId,
    user_id: null,
    user_email: adminUser.email,
    customer_name: parsed.data.customerName,
    customer_contact: parsed.data.customerContact,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    hourly_rate: rates[0],
    total_amount: totalAmount,
    downpayment_amount: downpaymentAmount,
    payment_method: "ONSITE",
    payment_status: parsed.data.paymentStatus,
    payment_reference: null,
    payment_proof_url: null,
    payment_proof_public_id: null,
    status: "ACCEPTED",
    accepted_at: now,
    reviewed_at: now,
    reviewed_by_email: adminUser.email,
    review_reason: "Added directly by admin as an onsite booking.",
  });

  if (error) {
    if (error.code === "23P01" || error.code === "23505") {
      return {
        ok: false,
        error: "That court was just reserved during this time. Refresh the schedule and try again.",
      };
    }
    return { ok: false, error: `Unable to add onsite booking: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}
