import Link from "next/link";
import type { AdminBookingNotification } from "@/types/admin/adminBooking";
import { formatPeso } from "@/lib/pricing";
import { formatBookingSchedule } from "@/utils/booking/formatBookingSchedule";
import { formatPaymentMethod } from "@/utils/admin/formatPaymentMethod";
import { ProfileImage } from "./ProfileImage";

export function AdminNotificationMenuItem({
  notification,
  onClick,
}: {
  notification: AdminBookingNotification;
  onClick?: () => void;
}) {
  return (
    <Link
      className="block min-w-0 rounded-lg border border-lime-400/20 bg-lime-400/10 p-3 transition hover:border-lime-300/45 hover:bg-lime-400/15"
      href="/admin"
      onClick={onClick}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <ProfileImage
          avatarUrl={notification.customerAvatarUrl}
          displayName={notification.customerName}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black text-lime-100">
            {notification.customerName}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">
            Booked {notification.courtName} on{" "}
            {formatBookingSchedule(notification.startAt)}.
          </p>
          <p className="mt-1 truncate text-[0.68rem] text-zinc-500">
            {formatPaymentMethod(notification.paymentMethod)} -{" "}
            {formatPeso(notification.downpaymentAmount)} of{" "}
            {formatPeso(notification.totalAmount)}
          </p>
        </div>
      </div>
    </Link>
  );
}
