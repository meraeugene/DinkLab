import { isKnownCourtId, normalizeCourtId } from "@/utils/booking/normalizeCourtId";
import {
  getHourlyRate,
  getPromoLabel,
  getPromoHourlyRate,
  isBeforeBookingOpeningDate,
} from "@/lib/pricing";
import { createAdminClient } from "@/utils/supabase/admin";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import {
  CourtSlot,
  formatSlotLabel,
  getOperatingHours,
  manilaHourToUtc,
} from "@/lib/time";

export function isKnownCourt(courtId: string) {
  return isKnownCourtId(courtId);
}

export function buildSlot(
  date: string,
  startHour: number,
  available = true,
  rate?: number,
): CourtSlot {
  const start = manilaHourToUtc(date, startHour);
  const end = manilaHourToUtc(date, startHour + 1);
  const resolvedRate = rate || getHourlyRate(startHour);
  const promoLabel = getPromoLabel(date, startHour);

  return {
    startHour,
    label: formatSlotLabel(startHour),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    available,
    rate: getPromoHourlyRate(date, startHour, resolvedRate),
    promoLabel,
  };
}

export async function getAvailableSlots(date: string, courtId: string) {
  const resolvedCourtId = normalizeCourtId(courtId);
  if (!resolvedCourtId) {
    throw new Error("Unknown court id.");
  }

  const supabase = createAdminClient();
  const rules = await getBusinessRules();
  const beforeOpening = isBeforeBookingOpeningDate(date);
  const slots = getOperatingHours(
    rules.settings.openHour,
    rules.settings.closeHour,
  ).map((hour) =>
    buildSlot(
      date,
      hour,
      !beforeOpening,
      getHourlyRate(hour),
    ),
  );
  const dayStart = manilaHourToUtc(date, rules.settings.openHour).toISOString();
  const dayEnd = manilaHourToUtc(date, rules.settings.closeHour).toISOString();
  const now = Date.now();

  const { data: bookingsWithAvatar, error: bookingsWithAvatarError } =
    await supabase
      .from("bookings")
      .select("start_at,end_at,status,user_id,user_email,customer_name,customer_avatar_url")
      .eq("court_id", resolvedCourtId)
      .lt("start_at", dayEnd)
      .gt("end_at", dayStart);

  let bookings = bookingsWithAvatar || [];
  let bookingsError = bookingsWithAvatarError;

  if (
    bookingsWithAvatarError &&
    isMissingAvatarColumn(bookingsWithAvatarError)
  ) {
    const fallback = await supabase
      .from("bookings")
      .select("start_at,end_at,status,user_id,user_email,customer_name")
      .eq("court_id", resolvedCourtId)
      .lt("start_at", dayEnd)
      .gt("end_at", dayStart);

    bookings = (fallback.data || []).map((booking) => ({
      ...booking,
      customer_avatar_url: null,
    }));
    bookingsError = fallback.error;
  }

  if (bookingsError) throw bookingsError;

  const occupiedBookings = bookings.filter((booking) =>
    ["ACCEPTED", "CONFIRMED"].includes(String(booking.status)),
  );
  const enrichedOccupiedBookings = await Promise.all(
    occupiedBookings.map(async (booking) => {
      if (booking.customer_avatar_url || !booking.user_id) return booking;

      const { data } = await supabase.auth.admin.getUserById(booking.user_id);
      const metadata = data.user?.user_metadata || {};

      return {
        ...booking,
        customer_name:
          booking.customer_name ||
          getMetadataValue(metadata, "full_name") ||
          getMetadataValue(metadata, "name") ||
          booking.user_email?.split("@")[0] ||
          "Player",
        customer_avatar_url:
          getMetadataValue(metadata, "avatar_url") ||
          getMetadataValue(metadata, "picture") ||
          null,
      };
    }),
  );

  return slots.map((slot) => {
    const slotStart = new Date(slot.startAt).getTime();
    const slotEnd = new Date(slot.endAt).getTime();
    const occupied = enrichedOccupiedBookings.find((booking) => {
      const bookingStart = new Date(booking.start_at).getTime();
      const bookingEnd = new Date(booking.end_at).getTime();

      return bookingStart < slotEnd && bookingEnd > slotStart;
    });

    return {
      ...slot,
      available:
        slot.available && !occupied && new Date(slot.startAt).getTime() > now,
      occupiedByName: occupied?.customer_name || undefined,
      occupiedByAvatarUrl: occupied?.customer_avatar_url || undefined,
    };
  });
}

function getMetadataValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isMissingAvatarColumn(error: { message?: string; code?: string }) {
  const message = (error.message || "").toLowerCase();
  return (
    message.includes("customer_avatar_url") ||
    message.includes("column") ||
    error.code === "42703"
  );
}

export async function hasSlotConflict(
  courtId: string,
  startAt: string,
  endAt: string,
) {
  const resolvedCourtId = normalizeCourtId(courtId);
  if (!resolvedCourtId) throw new Error("Unknown court id.");

  const supabase = createAdminClient();
  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status")
    .eq("court_id", resolvedCourtId)
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .limit(1);

  if (bookingError) throw bookingError;

  return Boolean(
    bookings?.some((booking) =>
      ["ACCEPTED", "CONFIRMED"].includes(String(booking.status)),
    ),
  );
}
