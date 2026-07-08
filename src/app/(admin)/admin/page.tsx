import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminEmails } from "@/utils/env/appEnv";
import { createClient } from "@/utils/supabase/server";
import { getAdminBookings } from "@/utils/admin/getAdminBookings";
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
  const { bookingRows, safePage, totalCount, totalPages } =
    await getAdminBookings(params?.page);

  return (
    <AdminBookingDashboard
      bookingRows={bookingRows}
      currentPage={safePage}
      totalCount={totalCount}
      totalPages={totalPages}
    />
  );
}
