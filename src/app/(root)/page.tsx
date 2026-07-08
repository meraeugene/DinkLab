import { getAdminEmails } from "@/utils/env/appEnv";
import { createClient } from "@/utils/supabase/server";
import { getAcceptedBookings } from "@/utils/booking/getAcceptedBookings";
import { getUserAvatarUrl } from "@/utils/users/getUserAvatarUrl";
import { getUserDisplayName } from "@/utils/users/getUserDisplayName";
import { todayInManila } from "@/lib/time";
import { AcceptedBookingsSection } from "@/components/accepted-bookings/AcceptedBookingsSection";
import { AmenitiesSection } from "@/components/home/AmenitiesSection";
import { BookingWidget } from "@/components/booking-widget/BookingWidget";
import { FindUsSection } from "@/components/home/FindUsSection";
import { HeroSection } from "@/components/home/HeroSection";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SplashScreen } from "@/components/system/SplashScreen";
import { TournamentSection } from "@/components/home/TournamentSection";
import FooterSection from "@/components/home/FooterSection";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialName = getUserDisplayName(user);
  const avatarUrl = getUserAvatarUrl(user) || "";
  const isAdmin = Boolean(
    user?.email && getAdminEmails().includes(user.email.toLowerCase()),
  );
  const bookings = user ? await getAcceptedBookings(user.id) : [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed left-1/2 top-0 hidden h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-[130px] sm:block" />

      <SplashScreen />
      <SiteHeader
        avatarUrl={avatarUrl}
        bookings={bookings}
        email={user?.email}
        fullName={initialName}
        isAdmin={isAdmin}
      />
      <HeroSection />
      <AcceptedBookingsSection bookings={bookings} signedIn={Boolean(user)} />
      <AmenitiesSection />
      <TournamentSection />
      <BookingWidget
        initialDate={todayInManila()}
        initialName={initialName}
        signedIn={Boolean(user)}
      />
      <FindUsSection />
      <FooterSection />
    </main>
  );
}
