import { Landmark } from "lucide-react";
import type { PaymentMethod } from "@/types/bookingWidget";
import { paymentQrDetails } from "@/data/payments/paymentQrDetails";

export function PaymentQrCard({
  paymentMethod,
}: {
  paymentMethod: Exclude<PaymentMethod, "ONSITE">;
}) {
  const details = paymentQrDetails[paymentMethod];

  return (
    <div className={`rounded-2xl border p-4 ${details.accent}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
            {details.label}
          </p>
          <p className="mt-1 font-bold text-white">{details.name}</p>
          <p className="text-sm text-zinc-400">{details.number}</p>
        </div>
        <Landmark className="h-5 w-5 text-white/70" />
      </div>
      <div
        aria-label={`${details.label} QR code`}
        className="mt-4 aspect-square w-full rounded-xl border border-white/10 bg-white bg-contain bg-center bg-no-repeat"
        role="img"
        style={{ backgroundImage: `url(${details.image})` }}
      />
    </div>
  );
}
