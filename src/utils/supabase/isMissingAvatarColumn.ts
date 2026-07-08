export function isMissingAvatarColumn(error: { message?: string; code?: string }) {
  const message = (error.message || "").toLowerCase();
  return (
    message.includes("customer_avatar_url") ||
    message.includes("column") ||
    error.code === "42703"
  );
}
