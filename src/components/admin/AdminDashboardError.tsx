"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export function AdminDashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-black px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-red-300/25 bg-zinc-950 p-6 text-center shadow-2xl">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-red-300/25 bg-red-400/10 text-red-200">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-xl font-black uppercase tracking-[0.08em]">
          Bookings could not be loaded
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          No booking data was hidden or removed. Check the connection and try
          loading the admin dashboard again.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            className="premium-button min-h-11 cursor-pointer rounded-lg px-4 font-display text-xs font-black uppercase tracking-[0.14em]"
            type="button"
            onClick={reset}
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 font-display text-xs font-black uppercase tracking-[0.14em] text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.08]"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>
      </section>
    </main>
  );
}
