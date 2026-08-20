"use client";

import { useState, useTransition } from "react";
import { CheckCircle, X } from "lucide-react";
import { updateBookingPayment } from "@/actions/bookings/updateBookingPayment";
import { formatPeso } from "@/lib/pricing";

type UpdatePaymentActionProps = {
  amountPaid: number;
  bookingId: string;
  compact: boolean;
  onUpdated: () => Promise<void>;
  totalAmount: number;
};

export function UpdatePaymentAction({
  amountPaid,
  bookingId,
  compact,
  onUpdated,
  totalAmount,
}: UpdatePaymentActionProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const remainingBalance = Math.max(0, totalAmount - amountPaid);

  if (remainingBalance === 0) {
    return (
      <p className={`${compact ? "inline-flex h-10 items-center justify-center" : "admin-action-button"} gap-2 rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 text-center font-display text-xs font-black uppercase tracking-[0.12em] text-lime-200`}>
        <CheckCircle className="h-4 w-4" />
        Fully paid
      </p>
    );
  }

  function submitPayment(formData: FormData, markFullyPaid = false) {
    setError(null);
    formData.set("bookingId", bookingId);
    formData.set("markFullyPaid", String(markFullyPaid));

    startTransition(async () => {
      const result = await updateBookingPayment(formData);
      if (!result.ok) {
        setError(result.error || "Unable to update this payment.");
        return;
      }
      setOpen(false);
      await onUpdated();
    });
  }

  return (
    <>
      <button
        className={`${compact ? "inline-flex h-10 items-center justify-center" : "admin-action-button"} cursor-pointer rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 font-display text-xs font-black uppercase tracking-[0.12em] text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-300/20`}
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Update payment
      </button>

      {open ? (
        <div
          aria-label="Update booking payment"
          aria-modal="true"
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-300/25 bg-zinc-950 p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-black text-white">
                  Update payment
                </h3>
                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  Record a new payment received from the customer.
                </p>
              </div>
              <button
                aria-label="Close payment update"
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-white/25 hover:text-white"
                disabled={pending}
                type="button"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <dt className="text-zinc-500">Paid so far</dt>
                <dd className="mt-1 text-base font-black text-white">
                  {formatPeso(amountPaid)}
                </dd>
              </div>
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3">
                <dt className="text-amber-200/70">Balance</dt>
                <dd className="mt-1 text-base font-black text-amber-100">
                  {formatPeso(remainingBalance)}
                </dd>
              </div>
            </dl>

            {error ? (
              <p className="mt-3 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-100">
                {error}
              </p>
            ) : null}

            <form className="mt-4 grid gap-3" action={submitPayment}>
              <label className="grid gap-2 text-xs font-bold text-zinc-300">
                Additional amount received
                <div className="flex items-center rounded-lg border border-white/15 bg-black/40 px-3 focus-within:border-amber-300/45">
                  <span className="text-zinc-500">PHP</span>
                  <input
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm font-bold text-white outline-none"
                    inputMode="numeric"
                    max={remainingBalance}
                    min="1"
                    name="additionalAmount"
                    placeholder="0"
                    required
                    step="1"
                    type="number"
                  />
                </div>
              </label>
              <button
                className="premium-button min-h-11 cursor-pointer rounded-lg px-4 font-display text-xs font-black uppercase tracking-[0.14em] disabled:cursor-wait disabled:opacity-60"
                disabled={pending}
                type="submit"
              >
                {pending ? "Saving..." : "Add payment"}
              </button>
            </form>

            <div className="my-3 flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.16em] text-zinc-600">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form action={(formData) => submitPayment(formData, true)}>
              <button
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-lime-300/30 bg-lime-300/10 px-4 font-display text-xs font-black uppercase tracking-[0.14em] text-lime-200 transition hover:border-lime-200/55 hover:bg-lime-300/20 disabled:cursor-wait disabled:opacity-60"
                disabled={pending}
                type="submit"
              >
                <CheckCircle className="h-4 w-4" />
                Mark fully paid {formatPeso(remainingBalance)}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
