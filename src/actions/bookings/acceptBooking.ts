"use server";

import { revalidatePath } from "next/cache";
import { sendAcceptanceEmail } from "@/utils/email/bookingEmail";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";
import { getJoinedCourtName } from "@/utils/admin/getJoinedCourtName";

export async function acceptBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  const adminUser = await requireAdmin();
  if (!bookingId || !adminUser) {
    return { ok: false, error: "Unauthorized." };
  }

  const admin = createAdminClient();
  const { data: targetBooking } = await admin
    .from("bookings")
    .select("booking_group_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!targetBooking?.booking_group_id) {
    return { ok: false, error: "This booking group is missing. Run the latest Supabase migration." };
  }

  const { data, error } = await admin.rpc("accept_pending_booking", {
    target_booking_id: bookingId,
  });

  if (error) {
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: false, error: "Unable to accept booking." };
  }

  const acceptedBooking = Array.isArray(data) ? data[0] : null;
  if (acceptedBooking?.conflict) {
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: false, error: "This slot is already reserved." };
  }

  if (!acceptedBooking?.accepted) {
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: false, error: "This booking can no longer be accepted." };
  }

  await admin
    .from("bookings")
    .update({ reviewed_by_email: adminUser.email })
    .eq("booking_group_id", targetBooking.booking_group_id);

  const { data: groupBookings } = await admin
    .from("bookings")
    .select("customer_name,user_email,start_at,end_at,total_amount,courts(name)")
    .eq("booking_group_id", targetBooking.booking_group_id)
    .eq("status", "ACCEPTED")
    .order("start_at", { ascending: true });

  const acceptedGroup = groupBookings || [];
  const firstBooking = acceptedGroup[0];
  const lastBooking = acceptedGroup.at(-1);

  if (firstBooking && lastBooking) {
    await sendAcceptanceEmail({
      customerName: firstBooking.customer_name,
      to: firstBooking.user_email,
      startAt: firstBooking.start_at,
      endAt: lastBooking.end_at,
      totalAmount: acceptedGroup.reduce(
        (sum, booking) => sum + booking.total_amount,
        0,
      ),
      courtName: getJoinedCourtName(firstBooking.courts) || "DinkLab court",
      schedule: acceptedGroup.map((booking) => ({
        courtName: getJoinedCourtName(booking.courts) || "DinkLab court",
        startAt: booking.start_at,
        endAt: booking.end_at,
      })),
    }).catch(() => undefined);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}
