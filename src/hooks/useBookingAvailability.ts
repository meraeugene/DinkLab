"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { Availability, AvailabilityByDate } from "@/types/bookingWidget";
import {
  buildUnavailableSlots,
  fetchAvailabilitySlots,
  getDisplaySlots,
  isSameMonth,
} from "@/utils/booking/bookingWidgetCalendar";

type UseBookingAvailabilityOptions = {
  calendarDates: string[];
  calendarMonth: string;
  courtIds: string[];
  date: string;
  initialDate: string;
  open: boolean;
};

export function useBookingAvailability({
  calendarDates,
  calendarMonth,
  courtIds,
  date,
  initialDate,
  open,
}: UseBookingAvailabilityOptions) {
  const [availabilityByDate, setAvailabilityByDate] =
    useState<AvailabilityByDate>({});
  const courtKey = courtIds.join("|");
  const availabilityDates = useMemo(
    () =>
      calendarDates.filter(
        (item) => isSameMonth(item, calendarMonth) && item >= initialDate,
      ),
    [calendarDates, calendarMonth, initialDate],
  );
  const selectedAvailabilityKey = open && courtIds.length
    ? (["booking-availability", date, courtKey] as const)
    : null;
  const {
    data: selectedDateAvailability,
    error: selectedDateError,
    isLoading: selectedDateLoading,
    mutate: mutateSelectedDateAvailability,
  } = useSWR(selectedAvailabilityKey, () => fetchDateAvailability(date, courtIds), {
      revalidateOnFocus: true,
      refreshInterval: open ? 10000 : 0,
    });

  useEffect(() => {
    if (!open || !courtIds.length) return;

    let alive = true;
    const missingDates = availabilityDates.filter((item) =>
      courtIds.some((courtId) => !availabilityByDate[item]?.[courtId]),
    );
    if (!missingDates.length) return;

    Promise.all(
      missingDates.map(async (item) => {
        try {
          return [item, await fetchDateAvailability(item, courtIds)] as const;
        } catch {
          return [
            item,
            Object.fromEntries(
              courtIds.map((courtId) => [courtId, buildUnavailableSlots(item)]),
            ),
          ] as const;
        }
      }),
    ).then((entries) => {
      if (!alive) return;
      setAvailabilityByDate((current) => {
        const next = { ...current };
        for (const [item, availability] of entries) {
          next[item] = { ...(next[item] || {}), ...availability };
        }
        return next;
      });
    });

    return () => {
      alive = false;
    };
  }, [availabilityByDate, availabilityDates, courtIds, courtKey, open]);

  const activeAvailabilityByDate = useMemo(() => {
    if (!selectedDateAvailability) return availabilityByDate;
    return {
      ...availabilityByDate,
      [date]: {
        ...(availabilityByDate[date] || {}),
        ...selectedDateAvailability,
      },
    };
  }, [availabilityByDate, date, selectedDateAvailability]);

  const displaySlotsByCourt = useMemo(
    () =>
      Object.fromEntries(
        courtIds.map((courtId) => {
          const slots = activeAvailabilityByDate[date]?.[courtId];
          return [
            courtId,
            selectedDateError && !slots
              ? buildUnavailableSlots(date)
              : getDisplaySlots(date, slots),
          ];
        }),
      ) as Availability,
    [activeAvailabilityByDate, courtIds, date, selectedDateError],
  );

  async function refreshAvailabilityForDate(targetDate = date) {
    const availability = await fetchDateAvailability(targetDate, courtIds);
    setAvailabilityByDate((current) => ({
      ...current,
      [targetDate]: { ...(current[targetDate] || {}), ...availability },
    }));
    if (targetDate === date) {
      await mutateSelectedDateAvailability(availability, { revalidate: false });
    }
    return availability;
  }

  return {
    availabilityByDate: activeAvailabilityByDate,
    displaySlotsByCourt,
    selectedDateLoading,
    refreshAvailabilityForDate,
  };
}

async function fetchDateAvailability(date: string, courtIds: string[]) {
  const entries = await Promise.all(
    courtIds.map(async (courtId) => [
      courtId,
      await fetchAvailabilitySlots(date, courtId),
    ] as const),
  );
  return Object.fromEntries(entries) as Availability;
}
