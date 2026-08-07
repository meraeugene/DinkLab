import { ArrowRight, Loader2, X } from "lucide-react";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import type { BookingAccessAction } from "@/types/bookingWidget";

export function BookingAccessModal({
  open,
  pendingAction,
  onClose,
  onGuest,
  onGoogle,
}: {
  open: boolean;
  pendingAction: BookingAccessAction;
  onClose: () => void;
  onGuest: () => void;
  onGoogle: () => void;
}) {
  if (!open) return null;

  return (
    <div
      aria-labelledby="booking-access-title"
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/80 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950 p-5 text-white shadow-[0_28px_100px_rgba(0,0,0,0.7)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3
            className="font-display text-2xl font-black uppercase"
            id="booking-access-title"
          >
            Continue booking
          </h3>
          <button
            aria-label="Close booking options"
            className="menu-icon-button cursor-pointer"
            disabled={pendingAction !== null}
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        

        <button
          className="premium-button font-display mt-5 h-12 w-full cursor-pointer rounded-xl px-5 text-xs font-black uppercase tracking-[0.2em]"
          disabled={pendingAction !== null}
          type="button"
          onClick={onGuest}
        >
          {pendingAction === "guest" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Continue as guest
        </button>

        <div className="my-4 flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-700">
          <span className="h-px flex-1 bg-white/10" />
          Or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.05] px-5 font-display text-xs font-black uppercase tracking-[0.18em] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pendingAction !== null}
          type="button"
          onClick={onGoogle}
        >
          {pendingAction === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>
      </div>
    </div>
  );
}
