export const MANILA_TIME_ZONE = "Asia/Manila";

export const COURTS = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Court 1" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Court 2" },
] as const;

export const BOOKING_STATUSES = [
  "PENDING_REVIEW",
  "ACCEPTED",
  "CANCELLED",
  "REJECTED",
] as const;

export const DEFAULT_ADMIN_EMAILS = [
  "gembangcaya29@gmail.com",
  "mandellaashafie1@gmail.com",
  "nifermalinao22@gmail.com",
  "andrewvillalon.dev@gmail.com",
] as const;

export const BOOKING_NOTIFICATION_OWNER_EMAIL =
  "andrewvillalon.dev@gmail.com";

// Set to false to send new-booking notifications to every configured admin.
export const LIMIT_BOOKING_NOTIFICATION_EMAILS_TO_OWNER = false;

export const DEFAULT_APP_URL = "http://localhost:3000";
