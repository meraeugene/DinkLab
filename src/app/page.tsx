import { BookingWidget } from "@/components/booking-widget";
import { SplashScreen } from "@/components/splash-screen";
import { AmenitiesSection } from "@/components/sections/amenities-section";
import { FindUsSection } from "@/components/sections/find-us-section";
import { HeroSection } from "@/components/sections/hero-section";
import { SiteHeader } from "@/components/sections/site-header";
import { TournamentSection } from "@/components/sections/tournament-section";
import { getAdminEmails } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { todayInManila } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialName = getUserDisplayName(user);
  const avatarUrl = getUserAvatarUrl(user);
  const isAdmin = Boolean(
    user?.email && getAdminEmails().includes(user.email.toLowerCase()),
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed left-1/2 top-0 hidden h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-[130px] sm:block" />

      <SplashScreen />
      <SiteHeader
        avatarUrl={avatarUrl}
        email={user?.email}
        fullName={initialName}
        isAdmin={isAdmin}
      />
      <HeroSection />
      <AmenitiesSection />
      <TournamentSection />
      <BookingWidget
        initialDate={todayInManila()}
        initialName={initialName}
        signedIn={Boolean(user)}
      />
      <FindUsSection />
      <footer className="court-section relative py-6">
        <div className="site-container">
          <p className="text-center text-xs font-medium text-zinc-600">
            Developed by{" "}
            <a
              className="text-zinc-400 transition hover:text-white"
              href="https://andrewvillalon.online"
              rel="noreferrer"
              target="_blank"
            >
              Andrew R. Villalon
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

function getUserDisplayName(
  user:
    | {
        email?: string | null;
        user_metadata?: Record<string, unknown>;
      }
    | null,
) {
  const fullName = user?.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const name = user?.user_metadata?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return user?.email?.split("@")[0] || "";
}

function getUserAvatarUrl(
  user:
    | {
        user_metadata?: Record<string, unknown>;
      }
    | null,
) {
  const avatarUrl = user?.user_metadata?.avatar_url;
  if (typeof avatarUrl === "string" && avatarUrl.trim()) {
    return avatarUrl.trim();
  }

  const picture = user?.user_metadata?.picture;
  if (typeof picture === "string" && picture.trim()) {
    return picture.trim();
  }

  return "";
}
