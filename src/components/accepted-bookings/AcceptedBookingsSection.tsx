"use client";

import {
  CalendarDays,
  CheckCircle,
  Clock3,
} from "lucide-react";
import { useAcceptedBookings } from "@/hooks/useAcceptedBookings";
import type { UserBooking } from "@/types/userBooking";
import { formatAcceptedBookingDate } from "@/utils/booking/formatAcceptedBookingDate";
import { formatAcceptedBookingTime } from "@/utils/booking/formatAcceptedBookingTime";
import { AcceptedBookingDetail } from "./AcceptedBookingDetail";

type AcceptedBookingsSectionProps = {
  bookings: UserBooking[];
  signedIn: boolean;
};

export function AcceptedBookingsSection({
  bookings,
  signedIn,
}: AcceptedBookingsSectionProps) {
  const { data: acceptedBookings = bookings } = useAcceptedBookings({
    enabled: signedIn,
    initialBookings: bookings,
  });

  if (!acceptedBookings.length) return null;

  return (
    <section className="relative court-section  bg-black  py-10">
      <div className="site-container">
        <div className="glass-panel silver-border rounded-2xl p-4 sm:p-5 lg:rounded-[2rem] lg:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-lime-200/70">
                Accepted Schedules
              </p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">
                Booked SlotS
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {acceptedBookings.map((booking) => (
              <article
                className="rounded-2xl border border-white/10 bg-black/35 p-4"
                key={booking.id}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className=" truncate  font-black text-white font-display uppercase tracking-widest">
                    {booking.courtName}
                  </h3>
                  <div className="shrink-0 rounded-full border border-lime-300/20 bg-lime-300/10 px-2 py-1 text-xs font-bold text-lime-200 flex items-center gap-2">
                    <CheckCircle className="inline-block w-4 h-4" />{" "}
                    Confirmed{" "}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <AcceptedBookingDetail
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Date"
                    value={formatAcceptedBookingDate(booking.startAt)}
                  />
                  <AcceptedBookingDetail
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Time"
                    value={`${formatAcceptedBookingTime(booking.startAt)} - ${formatAcceptedBookingTime(
                      booking.endAt,
                    )}`}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
