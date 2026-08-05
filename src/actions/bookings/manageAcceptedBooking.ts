"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { manilaHourToUtc } from "@/lib/time";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";
import { createAdminClient } from "@/utils/supabase/admin";

const cancelAcceptedBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().max(300).optional(),
});

const rescheduleAcceptedBookingSchema = z.object({
  bookingId: z.string().uuid(),
  courtId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.coerce.number().int().min(0).max(28),
});

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
  const parsed = rescheduleAcceptedBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    courtId: formData.get("courtId"),
    date: formData.get("date"),
    startHour: formData.get("startHour"),
  });
  const adminUser = await requireAdmin();
  if (!parsed.success || !adminUser?.email) {
    return { ok: false, error: "Unauthorized or invalid reschedule request." };
  }

  const courtId = normalizeCourtId(parsed.data.courtId);
  if (!courtId) return { ok: false, error: "Select a valid court." };

  const admin = createAdminClient();
  const [{ data: target, error: targetError }, rules, { data: court }] =
    await Promise.all([
      admin
        .from("bookings")
        .select("id,start_at,end_at")
        .eq("id", parsed.data.bookingId)
        .eq("status", "ACCEPTED")
        .maybeSingle(),
      getBusinessRules(),
      admin.from("courts").select("id").eq("id", courtId).maybeSingle(),
    ]);

  if (targetError || !target) {
    return { ok: false, error: "This reservation can no longer be rescheduled." };
  }
  if (!court) return { ok: false, error: "The selected court does not exist." };

  const durationMs =
    new Date(target.end_at).getTime() - new Date(target.start_at).getTime();
  const durationHours = durationMs / 3_600_000;
  if (!Number.isInteger(durationHours) || durationHours < 1) {
    return { ok: false, error: "This reservation has an unsupported duration." };
  }
  if (
    parsed.data.startHour < rules.settings.openHour ||
    parsed.data.startHour + durationHours > rules.settings.closeHour
  ) {
    return {
      ok: false,
      error: `Choose a start time that keeps the ${durationHours}-hour reservation within operating hours.`,
    };
  }

  const nextStart = manilaHourToUtc(parsed.data.date, parsed.data.startHour);
  const nextEnd = new Date(nextStart.getTime() + durationMs);
  if (nextStart.getTime() <= Date.now()) {
    return { ok: false, error: "Choose a future date and time." };
  }

  const { data, error } = await admin
    .from("bookings")
    .update({
      court_id: courtId,
      start_at: nextStart.toISOString(),
      end_at: nextEnd.toISOString(),
      cancelled_at: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by_email: adminUser.email,
      review_reason: "Accepted reservation rescheduled manually by admin.",
    })
    .eq("id", target.id)
    .eq("status", "ACCEPTED")
    .select("id");

  if (error) {
    const message = error.message.toLowerCase();
    if (
      error.code === "23P01" ||
      error.code === "23505" ||
      message.includes("booking_slot")
    ) {
      return {
        ok: false,
        error: "That replacement slot is already booked or temporarily held.",
      };
    }
    return { ok: false, error: "Unable to reschedule this reservation." };
  }
  if (!data?.length) {
    return { ok: false, error: "This reservation changed before it could be moved." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}
