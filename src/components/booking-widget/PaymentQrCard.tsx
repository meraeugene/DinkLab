import { Download } from "lucide-react";
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
      <div
        aria-label="Payment QR code"
        className="aspect-square w-full rounded-xl border border-white/10 bg-white bg-contain bg-center bg-no-repeat"
        role="img"
        style={{ backgroundImage: `url(${details.image})` }}
      />
      <a
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-white/35 hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        download={`dinklab-${paymentMethod.toLowerCase()}-qr.jpg`}
        href={details.image}
      >
        <Download className="h-4 w-4" />
        Download QR
      </a>
    </div>
  );
}
