"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";

export async function cancelManualBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  if (!bookingId || !(await requireAdmin())) return;

  const admin = createAdminClient();
  await admin.from("bookings").delete().eq("id", bookingId);

  revalidatePath("/admin");
  revalidatePath("/");
}
