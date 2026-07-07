import { COURTS } from "@/lib/constants";
import { getHourlyRate } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { CourtSlot, formatSlotLabel, getOperatingHours, manilaHourToUtc } from "@/lib/time";

export function isKnownCourt(courtId: string) {
  return COURTS.some((court) => court.id === courtId);
}

export function buildSlot(date: string, startHour: number, available = true): CourtSlot {
  const start = manilaHourToUtc(date, startHour);
  const end = manilaHourToUtc(date, startHour + 1);

  return {
    startHour,
    label: formatSlotLabel(startHour),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    available,
    rate: getHourlyRate(startHour),
  };
}

export async function getAvailableSlots(date: string, courtId: string) {
  const supabase = createAdminClient();
  const slots = getOperatingHours().map((hour) => buildSlot(date, hour));
  const dayStart = manilaHourToUtc(date, 8).toISOString();
  const dayEnd = manilaHourToUtc(date, 25).toISOString();
  const now = Date.now();

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("start_at,end_at,status")
    .eq("court_id", courtId)
    .gte("start_at", dayStart)
    .lt("start_at", dayEnd);

  if (bookingsError) throw bookingsError;

  const unavailable = new Set(
    (bookings || [])
      .filter((booking) =>
        ["ACCEPTED", "CONFIRMED"].includes(String(booking.status)),
      )
      .map((booking) => booking.start_at),
  );

  return slots.map((slot) => ({
    ...slot,
    available: slot.available && !unavailable.has(slot.startAt) && new Date(slot.startAt).getTime() > now,
  }));
}

export async function hasSlotConflict(courtId: string, startAt: string, endAt: string) {
  const supabase = createAdminClient();
  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status")
    .eq("court_id", courtId)
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
