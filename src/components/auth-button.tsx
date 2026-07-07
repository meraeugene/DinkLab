"use client";

import { LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type AuthButtonProps = {
  email?: string | null;
  fullName?: string | null;
  variant?: "compact" | "full";
};

export function AuthButton({ email, fullName, variant = "full" }: AuthButtonProps) {
  const supabase = createClient();

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (email) {
    const displayName = fullName?.trim() || email.split("@")[0] || "Player";

    if (variant === "compact") {
      return (
        <div className="flex h-14 max-w-xs items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[0.06]">
            <UserRound className="h-4 w-4" />
          </span>
          <span className="min-w-0 text-left">
            <span className="font-display block truncate text-[0.65rem] font-black uppercase tracking-[0.16em] text-white">
              {displayName}
            </span>
            <span className="block truncate text-[0.65rem] text-zinc-500">
              {email}
            </span>
          </span>
          <button
            aria-label="Log out"
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white"
            type="button"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="grid w-full max-w-sm gap-3">
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white">
            <UserRound className="h-5 w-5" />
          </span>
          <span className="min-w-0 text-left">
            <span className="font-display block truncate text-xs font-black uppercase tracking-[0.18em] text-white">
              {displayName}
            </span>
            <span className="mt-1 block truncate text-xs text-zinc-500">
              {email}
            </span>
          </span>
        </div>
        <button
          className="premium-button-dark font-display h-12 w-full rounded-xl px-4 text-xs font-black uppercase tracking-[0.2em]"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      className="premium-button h-14 w-full rounded-xl px-4 text-xs sm:text-sm cursor-pointer"
      onClick={signIn}
    >
      <GoogleIcon />
      <span className="hidden sm:inline font-display text-xs  uppercase ">
        Sign in with Google
      </span>
      <span className="sm:hidden font-display tracking-[0.17em]  text-xs  uppercase">
        Sign in
      </span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.89-1.74 2.99-4.3 2.99-7.44Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.22-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.08v2.59A9.99 9.99 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.89a6 6 0 0 1 0-3.78V7.52H3.08a10.01 10.01 0 0 0 0 8.96l3.33-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.99c1.47 0 2.79.51 3.83 1.5l2.86-2.86C16.96 3.01 14.7 2 12 2a9.99 9.99 0 0 0-8.92 5.52l3.33 2.59C7.2 7.75 9.4 5.99 12 5.99Z"
        fill="#EA4335"
      />
    </svg>
  );
}
