"use client";

import { ChevronDown, LayoutDashboard, Loader2, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type AuthButtonProps = {
  avatarUrl?: string | null;
  email?: string | null;
  fullName?: string | null;
  isAdmin?: boolean;
};

export function AuthButton({
  avatarUrl,
  email,
  fullName,
  isAdmin = false,
}: AuthButtonProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "signin" | "signout" | null
  >(null);

  async function signIn() {
    setPendingAction("signin");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signOut() {
    setPendingAction("signout");
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (!email) {
    return (
      <button
        className="premium-button auth-google-button rounded-xl px-3 font-display text-[0.62rem] font-black uppercase tracking-[0.16em] sm:px-4"
        disabled={pendingAction === "signin"}
        type="button"
        onClick={signIn}
      >
        {pendingAction === "signin" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        <span className="hidden sm:inline">Sign in with Google</span>
        <span className="sm:hidden">Sign in</span>
      </button>
    );
  }

  const displayName = fullName?.trim() || email.split("@")[0] || "Player";

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/35 px-2.5 text-left text-white transition hover:border-white/30 hover:bg-white/[0.06] sm:h-12 sm:px-3"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <ProfileImage avatarUrl={avatarUrl} displayName={displayName} />
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-xs font-bold">
            {displayName}
          </span>
          <span className="block max-w-36 truncate text-[0.65rem] text-zinc-500">
            {email}
          </span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-zinc-500 sm:block" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-3 w-64 rounded-xl border border-white/12 bg-zinc-950/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="flex min-w-0 items-center gap-3 rounded-lg bg-white/[0.04] p-2.5">
            <ProfileImage avatarUrl={avatarUrl} displayName={displayName} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-white">
                {displayName}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {email}
              </span>
            </span>
          </div>
          {isAdmin ? (
            <Link
              className="mt-2 flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
              href="/admin"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin Dashboard
            </Link>
          ) : null}
          <button
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.07] hover:text-white"
            disabled={pendingAction === "signout"}
            type="button"
            onClick={signOut}
          >
            {pendingAction === "signout" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProfileImage({
  avatarUrl,
  displayName,
}: {
  avatarUrl?: string | null;
  displayName: string;
}) {
  if (avatarUrl) {
    return (
      <span
        aria-label={`${displayName} profile`}
        className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/15 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      >
        <span className="sr-only">{displayName}</span>
      </span>
    );
  }

  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06]">
      <UserRound className="h-4 w-4" />
    </span>
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
