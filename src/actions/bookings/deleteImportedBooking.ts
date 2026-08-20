"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import {
  EXCEL_IMPORT_CONTACT,
  EXCEL_IMPORT_EMAIL,
  isExcelImportedBooking,
} from "@/utils/booking/isExcelImportedBooking";
import { createAdminClient } from "@/utils/supabase/admin";

const deleteImportedBookingSchema = z.object({
  bookingId: z.string().uuid(),
});

type ImportedBookingRow = {
  booking_group_id: string;
  customer_contact: string;
  user_email: string | null;
  user_id: string | null;
};

export async function deleteImportedBooking(formData: FormData) {
  const parsed = deleteImportedBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
  });
  const adminUser = await requireAdmin();
  if (!parsed.success || !adminUser) {
    return { ok: false, error: "Unauthorized or invalid delete request." };
  }

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from("bookings")
    .select("booking_group_id")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (targetError || !target?.booking_group_id) {
    return { ok: false, error: "This imported reservation no longer exists." };
  }

  const { data: groupRows, error: groupError } = await admin
    .from("bookings")
    .select("booking_group_id,user_id,user_email,customer_contact")
    .eq("booking_group_id", target.booking_group_id);
  const importedRows = (groupRows || []) as ImportedBookingRow[];
  const isImportedGroup =
    importedRows.length > 0 &&
    importedRows.every(
      (booking) =>
        booking.user_id === null && isExcelImportedBooking(booking),
    );

  if (groupError || !isImportedGroup) {
    return {
      ok: false,
      error: "Only reservations imported from Excel can be permanently deleted here.",
    };
  }

  const { count, error } = await admin
    .from("bookings")
    .delete({ count: "exact" })
    .eq("booking_group_id", target.booking_group_id)
    .is("user_id", null)
    .eq("user_email", EXCEL_IMPORT_EMAIL)
    .eq("customer_contact", EXCEL_IMPORT_CONTACT);

  if (error || count !== importedRows.length) {
    return { ok: false, error: "Unable to delete this imported reservation." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, deletedCount: count };
}
