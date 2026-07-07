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
  courtId: z.string().uuid(),
  startHour: z.coerce.number().int().min(8).max(24),
});

const manualBookingSchema = bookingSchema.extend({
  customerName: z.string().trim().min(2, "Enter your full name.").max(120),
  customerContact: z
    .string()
    .trim()
    .min(7, "Enter a valid contact number.")
    .max(32),
  referenceNumber: z.string().trim().max(120).optional(),
});

export async function createManualBooking(formData: FormData) {
  const parsed = manualBookingSchema.safeParse({
    date: formData.get("date"),
    courtId: formData.get("courtId"),
    startHour: formData.get("startHour"),
    customerName: formData.get("customerName"),
    customerContact: formData.get("customerContact"),
    referenceNumber: formData.get("referenceNumber") || undefined,
  });

  console.log(parsed);

  if (!parsed.success) {
    return { error: "Please complete the booking details before submitting." };
  }

  const receipt = formData.get("receipt");
  const hasReceipt = receipt instanceof File && receipt.size > 0;
  const referenceNumber = parsed.data.referenceNumber?.trim() || null;

  if (!referenceNumber && !hasReceipt) {
    return { error: "Add a reference number or upload a payment image." };
  }

  if (hasReceipt) {
    if (!receipt.type.startsWith("image/")) {
      return { error: "Payment image must be an image file." };
    }
    if (receipt.size > 5 * 1024 * 1024) {
      return { error: "Payment image must be 5MB or smaller." };
    }
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
  const customerName = getUserDisplayName(user) || parsed.data.customerName;
  let receiptPath: string | null = null;

  if (hasReceipt) {
    const safeName = receipt.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    receiptPath = `${user.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await admin.storage
      .from("payment-receipts")
      .upload(receiptPath, receipt, {
        contentType: receipt.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: "Unable to upload payment image." };
    }
  }

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
    payment_reference: referenceNumber,
    payment_proof_path: receiptPath,
    status: "PENDING_REVIEW",
  });

  if (bookingError) {
    return { error: "Unable to submit that booking. Please try again." };
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
  await admin
    .from("bookings")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

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
