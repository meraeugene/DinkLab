import type { PaymentMethod } from "@/types/bookingWidget";

export const paymentQrDetails: Record<
  Exclude<PaymentMethod, "ONSITE">,
  {
    accent: string;
    image: string;
    label: string;
  }
> = {
  BPI: {
    accent: "border-red-300/35 bg-red-500/[0.08]",
    image: "/payment-bpi-qr.jpg",
    label: "BPI",
  },
  GOTYME: {
    accent: "border-cyan-300/35 bg-cyan-500/[0.08]",
    image: "/payment-gotyme-qr.jpg",
    label: "GoTyme",
  },
};
