"use client";

import useSWR from "swr";
import type { UserBooking } from "@/types/userBooking";

export const ACCEPTED_BOOKINGS_KEY = "/api/bookings/accepted";

type UseAcceptedBookingsOptions = {
  enabled: boolean;
  initialBookings?: UserBooking[];
};

export function useAcceptedBookings({
  enabled,
  initialBookings = [],
}: UseAcceptedBookingsOptions) {
  return useSWR<UserBooking[]>(
    enabled ? ACCEPTED_BOOKINGS_KEY : null,
    fetchAcceptedBookings,
    {
      fallbackData: initialBookings,
      revalidateOnFocus: true,
      refreshInterval: enabled ? 10000 : 0,
    },
  );
}

async function fetchAcceptedBookings(url: string) {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to load accepted bookings.");
  }

  return (payload?.bookings || []) as UserBooking[];
}
