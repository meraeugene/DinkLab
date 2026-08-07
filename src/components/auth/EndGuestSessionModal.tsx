"use client";

import { AlertTriangle, Loader2, LogOut, X } from "lucide-react";
import { createPortal } from "react-dom";

export function EndGuestSessionModal({
  error,
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  error: string | null;
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div
      aria-labelledby="end-guest-session-title"
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid min-h-dvh place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950 p-5 text-white shadow-[0_28px_100px_rgba(0,0,0,0.7)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <button
            aria-label="Close confirmation"
            className="menu-icon-button cursor-pointer"
            disabled={pending}
            type="button"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3
          className="mt-5 font-display text-xl font-black uppercase"
          id="end-guest-session-title"
        >
          End guest session?
        </h3>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          You will lose access to this guest&apos;s booking history on this browser.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            className="h-11 cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="button"
            onClick={onCancel}
          >
            Keep session
          </button>
          <button
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-400/10 px-4 text-sm font-bold text-red-100 transition hover:border-red-300/55 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="button"
            onClick={onConfirm}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            End session
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
