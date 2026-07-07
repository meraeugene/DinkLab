import { BookingWidget } from "@/components/booking-widget";
import { AmenitiesSection } from "@/components/sections/amenities-section";
import { FindUsSection } from "@/components/sections/find-us-section";
import { HeroSection } from "@/components/sections/hero-section";
import { SiteHeader } from "@/components/sections/site-header";
import { TournamentSection } from "@/components/sections/tournament-section";
import { createClient } from "@/lib/supabase/server";
import { todayInManila } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialName = getUserDisplayName(user);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-[130px]" />

      <SiteHeader email={user?.email} fullName={initialName} />
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
