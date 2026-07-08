"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { CourtSlot } from "@/lib/time";
import type { AvailabilityByDate } from "@/types/bookingWidget";
import {
  buildUnavailableSlots,
  fetchAvailabilitySlots,
  getDayStatus,
  getDisplaySlots,
  isSameMonth,
} from "@/utils/booking/bookingWidgetCalendar";

type UseBookingAvailabilityOptions = {
  calendarDates: string[];
  calendarMonth: string;
  courtId: string;
  date: string;
  initialDate: string;
  open: boolean;
};

export function useBookingAvailability({
  calendarDates,
  calendarMonth,
  courtId,
  date,
  initialDate,
  open,
}: UseBookingAvailabilityOptions) {
  const [availabilityByDate, setAvailabilityByDate] =
    useState<AvailabilityByDate>({});

  const availabilityDates = useMemo(
    () =>
      calendarDates.filter(
        (item) => isSameMonth(item, calendarMonth) && item >= initialDate,
      ),
    [calendarDates, calendarMonth, initialDate],
  );
  const availabilityKey = availabilityDates.join("|");
  const selectedAvailabilityKey = open
    ? (["booking-availability", date, courtId] as const)
    : null;
  const { data: selectedDateSlots, mutate: mutateSelectedDateSlots } = useSWR(
    selectedAvailabilityKey,
    ([, targetDate, targetCourtId]) =>
      fetchAvailabilitySlots(targetDate, targetCourtId),
    {
      revalidateOnFocus: true,
      refreshInterval: open ? 10000 : 0,
    },
  );

  useEffect(() => {
    if (!open) return;

    let alive = true;
    const missingDates = availabilityDates.filter(
      (item) => !availabilityByDate[item]?.[courtId],
    );

    if (!missingDates.length) return;

    Promise.all(
      missingDates.map(async (item) => {
        try {
          const slots = await fetchAvailabilitySlots(item, courtId);
          return [item, slots] as const;
        } catch {
          return [item, buildUnavailableSlots(item)] as const;
        }
      }),
    ).then((entries) => {
      if (!alive) return;
      setAvailabilityByDate((current) => {
        const next = { ...current };
        for (const [item, slots] of entries) {
          next[item] = {
            ...(next[item] || {}),
            [courtId]: slots,
          };
        }
        return next;
      });
    });

    return () => {
      alive = false;
    };
  }, [availabilityByDate, availabilityDates, availabilityKey, courtId, open]);

  const activeAvailabilityByDate = useMemo(() => {
    if (!selectedDateSlots) return availabilityByDate;

    return {
      ...availabilityByDate,
      [date]: {
        ...(availabilityByDate[date] || {}),
        [courtId]: selectedDateSlots,
      },
    };
  }, [availabilityByDate, courtId, date, selectedDateSlots]);

  const activeDateSlots =
    selectedDateSlots || activeAvailabilityByDate[date]?.[courtId];

  const displaySlots = useMemo(
    () => getDisplaySlots(date, activeDateSlots),
    [activeDateSlots, date],
  );

  const selectedDayStatus = useMemo(
    () => getDayStatus(date, initialDate, activeDateSlots),
    [activeDateSlots, date, initialDate],
  );

  async function refreshAvailabilityForDate(targetDate = date) {
    const slots = await fetchAvailabilitySlots(targetDate, courtId);

    setAvailabilityByDate((current) => ({
      ...current,
      [targetDate]: {
        ...(current[targetDate] || {}),
        [courtId]: slots,
      },
    }));

    if (targetDate === date) {
      await mutateSelectedDateSlots(slots, { revalidate: false });
    }

    return slots;
  }

  function replaceSlots(targetDate: string, slots: CourtSlot[]) {
    setAvailabilityByDate((current) => ({
      ...current,
      [targetDate]: {
        ...(current[targetDate] || {}),
        [courtId]: slots,
      },
    }));
  }

  return {
    availabilityByDate: activeAvailabilityByDate,
    displaySlots,
    refreshAvailabilityForDate,
    replaceSlots,
    selectedDayStatus,
  };
}
