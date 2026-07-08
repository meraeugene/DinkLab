"use client";

import {
  Bell,
  CalendarCheck,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import useSWR from "swr";
import { useAcceptedBookings } from "@/hooks/useAcceptedBookings";
import { useAuthButton } from "@/hooks/useAuthButton";
import type { AdminBookingNotification } from "@/types/admin/adminBooking";
import type { UserBooking } from "@/types/userBooking";
import { AdminNotificationMenuItem } from "./AdminNotificationMenuItem";
import { BookingMenuItem } from "./BookingMenuItem";
import { GoogleIcon } from "./GoogleIcon";
import { NotificationMenuItem } from "./NotificationMenuItem";
import { ProfileImage } from "./ProfileImage";
import { TabButton } from "./TabButton";

type AuthButtonProps = {
  avatarUrl?: string | null;
  bookings?: UserBooking[];
  email?: string | null;
  fullName?: string | null;
  isAdmin?: boolean;
};

export function AuthButton({
  avatarUrl,
  bookings = [],
  email,
  fullName,
  isAdmin = false,
}: AuthButtonProps) {
  const auth = useAuthButton();
  const { data: acceptedBookings = bookings } = useAcceptedBookings({
    enabled: Boolean(email),
    initialBookings: bookings,
  });
  const {
    data: adminNotifications = [],
    isLoading: adminNotificationsLoading,
    mutate: refreshAdminNotifications,
  } = useSWR<AdminBookingNotification[]>(
    isAdmin && email && auth.open ? "/api/admin/notifications" : null,
    fetchAdminNotifications,
    {
      revalidateOnFocus: true,
      refreshInterval: auth.open ? 10000 : 0,
    },
  );

  useEffect(() => {
    if (!isAdmin || !auth.open) return;
    refreshAdminNotifications();
  }, [auth.open, isAdmin, refreshAdminNotifications]);

  const notificationCount = isAdmin
    ? adminNotifications.length
    : acceptedBookings.length;

  if (!email) {
    return (
      <button
        className="premium-button auth-google-button cursor-pointer rounded-xl px-3 font-display text-[0.62rem] font-black uppercase tracking-[0.16em] sm:px-4"
        disabled={auth.pendingAction === "signin"}
        type="button"
        onClick={auth.signIn}
      >
        {auth.pendingAction === "signin" ? (
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
        aria-expanded={auth.open}
        className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-black/35 px-2.5 text-left text-white transition hover:border-white/30 hover:bg-white/[0.06] sm:h-12 sm:px-3"
        type="button"
        onClick={() => auth.setOpen((value) => !value)}
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

      {auth.open ? (
        <div className="absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-white/12 bg-zinc-950/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
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
              onClick={() => auth.setOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin Dashboard
            </Link>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
            <TabButton
              active={auth.tab === "bookings"}
              icon={<CalendarCheck className="h-3.5 w-3.5" />}
              label="Bookings"
              onClick={() => auth.setTab("bookings")}
            />
            <TabButton
              active={auth.tab === "notifications"}
              count={notificationCount}
              icon={<Bell className="h-3.5 w-3.5" />}
              label="Notifications"
              onClick={() => {
                auth.setTab("notifications");
                if (isAdmin) refreshAdminNotifications();
              }}
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-2">
            {auth.tab === "notifications" && isAdmin ? (
              adminNotifications.length ? (
                <div className="grid gap-2">
                  {adminNotifications.map((notification) => (
                    <AdminNotificationMenuItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => auth.setOpen(false)}
                    />
                  ))}
                </div>
              ) : (
                <p className="px-3 py-6 text-center text-xs text-zinc-500">
                  {adminNotificationsLoading
                    ? "Loading booking notifications..."
                    : "No pending booking submissions."}
                </p>
              )
            ) : acceptedBookings.length ? (
              <div className="grid gap-2">
                {acceptedBookings.map((booking) =>
                  auth.tab === "bookings" ? (
                    <BookingMenuItem key={booking.id} booking={booking} />
                  ) : (
                    <NotificationMenuItem key={booking.id} booking={booking} />
                  ),
                )}
              </div>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-zinc-500">
                No accepted bookings yet.
              </p>
            )}
          </div>
          <button
            className="mt-2 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.07] hover:text-white"
            disabled={auth.pendingAction === "signout"}
            type="button"
            onClick={auth.signOut}
          >
            {auth.pendingAction === "signout" ? (
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

async function fetchAdminNotifications(url: string) {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to load admin notifications.");
  }

  return (payload?.notifications || []) as AdminBookingNotification[];
}
