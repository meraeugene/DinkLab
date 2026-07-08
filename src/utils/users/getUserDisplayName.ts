export function getUserDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null) {
  const fullName = user?.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const name = user?.user_metadata?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return user?.email?.split("@")[0] || "";
}
