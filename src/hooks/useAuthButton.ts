"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/browser";

export function useAuthButton(serverSignedIn: boolean) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"bookings" | "notifications">("bookings");
  const [pendingAction, setPendingAction] = useState<
    "signin" | "signout" | null
  >(null);

  useEffect(() => {
    const refreshWhenSessionChanged = (browserSignedIn: boolean) => {
      if (browserSignedIn !== serverSignedIn) {
        router.refresh();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      refreshWhenSessionChanged(Boolean(session?.user));
    });

    const syncRestoredPage = () => {
      void supabase.auth.getSession().then(({ data }) => {
        refreshWhenSessionChanged(Boolean(data.session?.user));
      });
    };

    window.addEventListener("pageshow", syncRestoredPage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", syncRestoredPage);
    };
  }, [router, serverSignedIn, supabase]);

  async function signIn() {
    setPendingAction("signin");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setPendingAction(null);
      return "Unable to continue with Google. Please try again.";
    }
    return null;
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
