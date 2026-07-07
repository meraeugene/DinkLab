export const MANILA_TIME_ZONE = "Asia/Manila";

export const COURTS = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Court 1" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Court 2" },
] as const;

export const BOOKING_STATUSES = [
  "PENDING_REVIEW",
  "ACCEPTED",
  "CANCELLED",
] as const;

export const DEFAULT_APP_URL = "http://localhost:3000";
