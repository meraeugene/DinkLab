import { CheckCircle, CircleDollarSign } from "lucide-react";
import type { AdminBooking } from "@/types/admin/adminBooking";

export function PaymentStatusBadge({
  status,
}: {
  status: AdminBooking["payment_status"];
}) {
  const fullyPaid = status === "PAID";

  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em]",
        fullyPaid
          ? "border-lime-300/40 bg-lime-300/10 text-lime-200"
          : "border-amber-300/30 bg-amber-300/[0.07] text-amber-200",
      ].join(" ")}
    >
      {fullyPaid ? (
        <CheckCircle className="h-3.5 w-3.5" />
      ) : (
        <CircleDollarSign className="h-3.5 w-3.5" />
      )}
      {fullyPaid ? "Fully paid" : status === "UNPAID" ? "Unpaid" : "Balance due"}
    </span>
  );
}
