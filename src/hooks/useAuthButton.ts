"use client";

import type { User } from "@supabase/supabase-js";
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
  // The signed-in user as the browser sees it. Lets the header show the
  // account right away while the server re-renders the page in the background.
  const [clientUser, setClientUser] = useState<User | null>(null);

  useEffect(() => {
    const refreshWhenSessionChanged = (browserSignedIn: boolean) => {
      if (browserSignedIn !== serverSignedIn) {
        router.refresh();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setClientUser(session?.user ?? null);
      refreshWhenSessionChanged(Boolean(session?.user));
    });

    const syncRestoredPage = () => {
      void supabase.auth.getSession().then(({ data }) => {
        setClientUser(data.session?.user ?? null);
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
    clientUser,
    open,
    pendingAction,
    setOpen,
    setTab,
    signIn,
    signOut,
    tab,
  };
}
