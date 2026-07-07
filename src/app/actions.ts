"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminEmails } from "@/lib/env";
import { getHourlyRate } from "@/lib/pricing";
import { buildSlot, hasSlotConflict, isKnownCourt } from "@/lib/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  courtId: z.string().refine(isKnownCourt, "Select a valid court before booking."),
  startHour: z.coerce.number().int().min(8).max(24),
});

const manualBookingSchema = bookingSchema.extend({
  customerName: z.string().trim().min(2, "Enter your full name.").max(120),
  customerContact: z
    .string()
    .trim()
    .regex(/^\d{7,15}$/, "Enter a valid contact number."),
  paymentMethod: z.enum(["BPI", "GOTYME", "ONSITE"]),
  paymentAmountMode: z.enum(["HALF", "FULL"]),
  referenceNumber: z.string().trim().max(120).optional(),
  paymentProofUrl: z.string().url().optional(),
  paymentProofPublicId: z.string().trim().max(255).optional(),
});

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

  if (!isKnownCourt(parsed.data.courtId)) {
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

  const slot = buildSlot(parsed.data.date, parsed.data.startHour);
  if (new Date(slot.startAt).getTime() <= Date.now()) {
    return { error: "Please choose a future slot." };
  }

  if (await hasSlotConflict(parsed.data.courtId, slot.startAt, slot.endAt)) {
    return {
      error: "That slot was just accepted. Please choose another time.",
    };
  }

  const admin = createAdminClient();
  const hourlyRate = getHourlyRate(parsed.data.startHour);
  const paymentAmount =
    parsed.data.paymentAmountMode === "FULL" ? hourlyRate : hourlyRate / 2;
  const customerName = getUserDisplayName(user) || parsed.data.customerName;

  const { error: bookingError } = await admin.from("bookings").insert({
    court_id: parsed.data.courtId,
    user_id: user.id,
    user_email: user.email,
    customer_name: customerName,
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
  });

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

export async function acceptBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  if (!bookingId || !(await requireAdmin())) return;

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("court_id,start_at,end_at,status")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.status !== "PENDING_REVIEW") return;
  if (
    await hasSlotConflict(booking.court_id, booking.start_at, booking.end_at)
  ) {
    revalidatePath("/admin");
    revalidatePath("/");
    return;
  }

  await admin
    .from("bookings")
    .update({
      status: "ACCEPTED",
      accepted_at: new Date().toISOString(),
      cancelled_at: null,
    })
    .eq("id", bookingId)
    .eq("status", "PENDING_REVIEW");

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function cancelManualBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  if (!bookingId || !(await requireAdmin())) return;

  const admin = createAdminClient();
  await admin.from("bookings").delete().eq("id", bookingId);

  revalidatePath("/admin");
  revalidatePath("/");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !getAdminEmails().includes(user.email.toLowerCase())) {
    return null;
  }

  return user;
}

function getUserDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const name = user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return user.email?.split("@")[0] || "";
}
