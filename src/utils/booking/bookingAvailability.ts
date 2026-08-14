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

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("start_at,end_at,status")
    .eq("court_id", resolvedCourtId)
    .lt("start_at", dayEnd)
    .gt("end_at", dayStart);

  if (bookingsError) throw bookingsError;

  const { data: activeHolds, error: holdsError } = await supabase
    .from("booking_holds")
    .select("start_at,end_at")
    .eq("court_id", resolvedCourtId)
    .gt("expires_at", new Date().toISOString())
    .lt("start_at", dayEnd)
    .gt("end_at", dayStart);

  if (holdsError) throw holdsError;

  const occupiedBookings = (bookings || []).filter((booking) =>
    ["PENDING_REVIEW", "ACCEPTED", "CONFIRMED"].includes(String(booking.status)),
  );

  const occupiedPeriods = [
    ...occupiedBookings,
    ...(activeHolds || []),
  ];

  return slots.map((slot) => {
    const slotStart = new Date(slot.startAt).getTime();
    const slotEnd = new Date(slot.endAt).getTime();
    const occupied = occupiedPeriods.find((booking) => {
      const bookingStart = new Date(booking.start_at).getTime();
      const bookingEnd = new Date(booking.end_at).getTime();

      return bookingStart < slotEnd && bookingEnd > slotStart;
    });

    return {
      ...slot,
      available:
        slot.available && !occupied && new Date(slot.startAt).getTime() > now,
      reserved: Boolean(occupied),
    };
  });
}

export async function hasSlotConflict(
  courtId: string,
  startAt: string,
  endAt: string,
) {
  const resolvedCourtId = normalizeCourtId(courtId);
  if (!resolvedCourtId) throw new Error("Unknown court id.");

  const supabase = createAdminClient();
  const [bookingResult, holdResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("id")
      .eq("court_id", resolvedCourtId)
      .in("status", ["PENDING_REVIEW", "ACCEPTED"])
      .lt("start_at", endAt)
      .gt("end_at", startAt)
      .limit(1),
    supabase
      .from("booking_holds")
      .select("id")
      .eq("court_id", resolvedCourtId)
      .gt("expires_at", new Date().toISOString())
      .lt("start_at", endAt)
      .gt("end_at", startAt)
      .limit(1),
  ]);

  if (bookingResult.error) throw bookingResult.error;
  if (holdResult.error) throw holdResult.error;

  return Boolean(bookingResult.data?.length || holdResult.data?.length);
}
