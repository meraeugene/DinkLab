import type { UserBooking } from "@/types/userBooking";
import { formatBookingSchedule } from "@/utils/booking/formatBookingSchedule";

export function BookingMenuItem({ booking }: { booking: UserBooking }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/30 p-3">
      <p className="truncate text-xs font-bold text-white">
        {booking.courtName}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-400">
        {formatBookingSchedule(booking.startAt)}
      </p>
      <p className="mt-1 truncate text-[0.68rem] text-zinc-600">
        Until {formatBookingSchedule(booking.endAt)}
      </p>
    </div>
  );
}
