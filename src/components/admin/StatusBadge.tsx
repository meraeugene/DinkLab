import { Ban, CheckCircle, Clock3, XCircle } from "lucide-react";
import type { AdminBooking } from "@/types/admin/adminBooking";

export function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const config =
    status === "PENDING_REVIEW"
      ? {
          icon: <Clock3 className="h-3.5 w-3.5" />,
          label: "Pending",
          tone: "border-amber-300/35 text-amber-200",
        }
      : status === "ACCEPTED"
        ? {
            icon: <CheckCircle className="h-3.5 w-3.5" />,
            label: "Confirmed",
            tone: "border-lime-400/35 text-lime-300",
          }
        : status === "REJECTED"
          ? {
              icon: <XCircle className="h-3.5 w-3.5" />,
              label: "Rejected",
              tone: "border-red-400/35 text-red-200",
            }
          : {
              icon: <Ban className="h-3.5 w-3.5" />,
              label: "Cancelled",
              tone: "border-zinc-500/45 text-zinc-300",
            };

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
        config.tone,
      ].join(" ")}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
