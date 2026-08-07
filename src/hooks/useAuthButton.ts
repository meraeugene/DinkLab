"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/browser";

export function useAuthButton() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"bookings" | "notifications">("bookings");
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      setPendingAction(null);
      return "Unable to end this session. Please try again.";
    }
    window.location.reload();
    return null;
  }

  return {
    open,
    pendingAction,
    setOpen,
    setTab,
    signIn,
    signOut,
    tab,
  };
}
