import type { PaymentMethod } from "@/types/bookingWidget";

export const paymentQrDetails: Record<
  Exclude<PaymentMethod, "ONSITE">,
  {
    accent: string;
    image: string;
    label: string;
    name: string;
    number: string;
  }
> = {
  BPI: {
    accent: "border-red-300/35 bg-red-500/[0.08]",
    image: "/payment-bpi-qr.jpg",
    label: "BPI",
    name: "Gem Bngcya",
    number: "**********782",
  },
  GOTYME: {
    accent: "border-cyan-300/35 bg-cyan-500/[0.08]",
    image: "/payment-gotyme-qr.jpg",
    label: "GoTyme",
    name: "Gem Daryl Bangcaya",
    number: "********2697",
  },
};
