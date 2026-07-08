import type { JoinedCourt } from "@/types/admin/adminBooking";

export function getJoinedCourtName(value: JoinedCourt) {
  if (Array.isArray(value)) return value[0]?.name || "Court";
  return value?.name || "Court";
}
