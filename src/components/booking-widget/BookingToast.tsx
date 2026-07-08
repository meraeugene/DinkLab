import { X } from "lucide-react";
import type { Toast } from "@/types/bookingWidget";

export function BookingToast({
  onClose,
  toast,
}: {
  onClose: () => void;
  toast: Exclude<Toast, null>;
}) {
  return (
    <div
      className={[
        "fixed inset-x-4 top-5 z-[70] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_20px_60px_rgba(0,0,0,0.4)]",
        toast.tone === "success"
          ? "border-emerald-300/30 bg-emerald-300 text-black"
          : toast.tone === "error"
            ? "border-red-300/30 bg-white text-black"
            : "border-white/15 bg-white text-black",
      ].join(" ")}
      role="status"
    >
      <span>{toast.message}</span>
      <button
        aria-label="Close message"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/10 transition hover:bg-black/10"
        type="button"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
