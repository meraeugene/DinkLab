import type { AdminBooking } from "@/types/admin/adminBooking";

export function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const label =
    status === "PENDING_REVIEW"
      ? "Pending review"
      : status === "ACCEPTED"
        ? "Accepted"
        : "Cancelled";

  return (
    <span
      className={[
        "inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
        status === "ACCEPTED"
          ? "border-lime-400/30 bg-lime-400/10 text-lime-300"
          : status === "CANCELLED"
            ? "border-red-400/25 bg-red-400/10 text-red-200"
            : "border-amber-300/25 bg-amber-300/10 text-amber-200",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
