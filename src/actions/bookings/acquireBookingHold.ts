"use server";

import { bookingRequestSchema } from "@/actions/bookings/schemas/manualBookingSchema";
import { isBeforeBookingOpeningDate } from "@/lib/pricing";
import { buildSlot } from "@/utils/booking/bookingAvailability";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type BookingHoldRow = {
  hold_token: string;
  expires_at: string;
};

export async function acquireBookingHold(formData: FormData) {
  let selections: unknown = [];
  try {
    selections = JSON.parse(String(formData.get("selections") || "[]"));
  } catch {
    return { ok: false, error: "The selected times are invalid. Please choose them again." };
  }

  const parsed = bookingRequestSchema.safeParse({
    date: formData.get("date"),
    selections,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Select at least one available time.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in with Google before booking." };
  }

  const rules = await getBusinessRules();
  if (isBeforeBookingOpeningDate(parsed.data.date)) {
    return { ok: false, error: "Bookings open on July 26, 2026." };
  }

  const normalizedSelections = parsed.data.selections.map((selection) => ({
    courtId: normalizeCourtId(selection.courtId),
    startHour: selection.startHour,
  }));
  if (
    normalizedSelections.some(
      (selection) =>
        !selection.courtId ||
        selection.startHour < rules.settings.openHour ||
        selection.startHour >= rules.settings.closeHour,
    )
  ) {
    return { ok: false, error: "Select valid times during operating hours." };
  }

  const uniqueSelections = new Set(
    normalizedSelections.map((selection) => `${selection.courtId}:${selection.startHour}`),
  );
  if (uniqueSelections.size !== normalizedSelections.length) {
    return { ok: false, error: "A selected court and time was duplicated." };
  }

  const slots = normalizedSelections.map((selection) => {
    const slot = buildSlot(parsed.data.date, selection.startHour);
    return {
      court_id: selection.courtId!,
      start_at: slot.startAt,
      end_at: slot.endAt,
    };
  });
  if (slots.some((slot) => new Date(slot.start_at).getTime() <= Date.now())) {
    return { ok: false, error: "Please choose a future slot." };
  }

  const admin = createAdminClient();
  const courtIds = [...new Set(slots.map((slot) => slot.court_id))];
  const { data: courts, error: courtError } = await admin
    .from("courts")
    .select("id")
    .in("id", courtIds);
  if (courtError || (courts || []).length !== courtIds.length) {
    return { ok: false, error: "Select a valid court before booking." };
  }

  const { data, error } = await admin.rpc("acquire_booking_hold", {
    p_user_id: user.id,
    p_slots: slots,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("booking_hold_conflict")) {
      return {
        ok: false,
        error: "One or more slots were just reserved. Please choose another time.",
      };
    }
    if (
      message.includes("acquire_booking_hold") ||
      message.includes("booking_holds") ||
      message.includes("function")
    ) {
      return {
        ok: false,
        error: "Booking holds are not installed yet. Run the latest Supabase migration.",
      };
    }
    return { ok: false, error: "Unable to hold these slots. Please try again." };
  }

  const hold = (Array.isArray(data) ? data[0] : null) as BookingHoldRow | null;
  if (!hold?.hold_token || !hold.expires_at) {
    return { ok: false, error: "Unable to hold these slots. Please try again." };
  }

  return {
    ok: true,
    holdToken: hold.hold_token,
    expiresAt: hold.expires_at,
  };
}
