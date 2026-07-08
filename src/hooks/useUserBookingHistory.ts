"use client";

import useSWR from "swr";
import type { UserBooking } from "@/types/userBooking";

export const USER_BOOKING_HISTORY_KEY = "/api/bookings/history";

type UseUserBookingHistoryOptions = {
  enabled: boolean;
  initialBookings?: UserBooking[];
};

export function useUserBookingHistory({
  enabled,
  initialBookings = [],
}: UseUserBookingHistoryOptions) {
  return useSWR<UserBooking[]>(
    enabled ? USER_BOOKING_HISTORY_KEY : null,
    fetchUserBookingHistory,
    {
      fallbackData: initialBookings,
      revalidateOnFocus: true,
      refreshInterval: enabled ? 10000 : 0,
    },
  );
}

async function fetchUserBookingHistory(url: string) {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to load booking history.");
  }

  return (payload?.bookings || []) as UserBooking[];
}
