import type { UserBooking } from "@/types/userBooking";
import { formatBookingSchedule } from "@/utils/booking/formatBookingSchedule";

export function NotificationMenuItem({ booking }: { booking: UserBooking }) {
  return (
    <div className="min-w-0 rounded-lg border border-lime-400/20 bg-lime-400/10 p-3">
      <p className="line-clamp-2 text-xs font-semibold leading-5 text-lime-100">
        Your booking for {booking.courtName} on{" "}
        {formatBookingSchedule(booking.startAt)} was accepted.
      </p>
    </div>
  );
}
