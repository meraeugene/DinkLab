import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminEmails } from "@/utils/env/appEnv";
import { createClient } from "@/utils/supabase/server";
import { getAdminBookings } from "@/utils/admin/getAdminBookings";
import { getBusinessRules } from "@/utils/booking/getBusinessRules";
import { AdminBookingDashboard } from "@/components/admin/AdminBookingDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminPageProps = {
  searchParams?: Promise<{
    page?: string | string[];
    status?: string | string[];
    courtId?: string | string[];
    paymentMethod?: string | string[];
    date?: string | string[];
    q?: string | string[];
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/");
  if (!getAdminEmails().includes(user.email.toLowerCase())) redirect("/");

  const params = await searchParams;
  const [
    { bookingRows, safePage, totalCount, totalPages, filters },
    businessRules,
  ] = await Promise.all([getAdminBookings(params), getBusinessRules()]);

  return (
    <AdminBookingDashboard
      bookingRows={bookingRows}
      courts={businessRules.courts}
      currentPage={safePage}
      filters={filters}
      settings={businessRules.settings}
      totalCount={totalCount}
      totalPages={totalPages}
    />
  );
}
