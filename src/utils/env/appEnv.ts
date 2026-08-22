import {
  BOOKING_NOTIFICATION_OWNER_EMAIL,
  DEFAULT_ADMIN_EMAILS,
  DEFAULT_APP_URL,
  LIMIT_BOOKING_NOTIFICATION_EMAILS_TO_OWNER,
} from "@/data/app/appConfig";

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
}

export function getAdminEmails() {
  const configuredEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(
    new Set([...DEFAULT_ADMIN_EMAILS, ...configuredEmails]),
  );
}

export function getBookingNotificationEmails() {
  return LIMIT_BOOKING_NOTIFICATION_EMAILS_TO_OWNER
    ? [BOOKING_NOTIFICATION_OWNER_EMAIL]
    : getAdminEmails();
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
