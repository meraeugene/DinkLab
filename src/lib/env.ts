import { DEFAULT_ADMIN_EMAILS, DEFAULT_APP_URL } from "@/lib/constants";

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

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
