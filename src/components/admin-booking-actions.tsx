"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { acceptBooking, cancelManualBooking } from "@/app/actions";

type AdminBookingActionsProps = {
  bookingId: string;
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED";
};

export function AdminBookingActions({
  bookingId,
  status,
}: AdminBookingActionsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {status === "PENDING_REVIEW" ? (
        <form action={acceptBooking}>
          <input name="bookingId" type="hidden" value={bookingId} />
          <ActionButton className="premium-button h-10 min-h-10 w-full rounded-lg px-4 font-display text-xs font-black uppercase tracking-[0.18em]">
            Accept
          </ActionButton>
        </form>
      ) : null}
      {status !== "CANCELLED" ? (
        <form action={cancelManualBooking}>
          <input name="bookingId" type="hidden" value={bookingId} />
          <ActionButton className="h-10 w-full rounded-lg border border-white/15 bg-white/[0.035] px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:border-red-300/35 hover:bg-red-400/10 hover:text-red-100">
            Reject
          </ActionButton>
        </form>
      ) : null}
    </div>
  );
}

function ActionButton({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      <span className="inline-flex items-center gap-2">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {pending ? `${children}...` : children}
      </span>
    </button>
  );
}
