import type { AdminBooking } from "@/types/admin/adminBooking";

export function formatPaymentMethod(value: AdminBooking["payment_method"]) {
  if (value === "GOTYME") return "GoTyme";
  if (value === "ONSITE") return "Onsite";
  return "BPI";
}
