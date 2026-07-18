import { getAdminEmails } from "@/utils/env/appEnv";
import { createClient } from "@/utils/supabase/server";
import {
  getAcceptedBookings,
  getUserBookingHistory,
} from "@/utils/booking/getAcceptedBookings";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { getUserAvatarUrl } from "@/utils/users/getUserAvatarUrl";
import { getUserDisplayName } from "@/utils/users/getUserDisplayName";
import { todayInManila } from "@/lib/time";
import { AmenitiesSection } from "@/components/home/AmenitiesSection";
import { BookingWidget } from "@/components/booking-widget/BookingWidget";
import { CustomerBookingsSection } from "@/components/customer-bookings/CustomerBookingsSection";
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
  const [bookings, bookingHistory, businessRules] = await Promise.all([
    user ? getAcceptedBookings(user.id) : [],
    user ? getUserBookingHistory(user.id) : [],
    getBusinessRules(),
  ]);

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
      <HeroSection businessRules={businessRules} />
      <CustomerBookingsSection
        bookings={bookingHistory}
        signedIn={Boolean(user)}
      />
      <AmenitiesSection />
      <BookingWidget
        initialDate={todayInManila()}
        initialName={initialName}
        courts={businessRules.courts}
        pricingBands={businessRules.pricingBands}
        signedIn={Boolean(user)}
      />
      <TournamentSection />
      <FindUsSection />
      <FooterSection />
    </main>
  );
}
