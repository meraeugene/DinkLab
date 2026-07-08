export function getUserAvatarUrl(user: {
  user_metadata?: Record<string, unknown>;
} | null) {
  const avatarUrl = user?.user_metadata?.avatar_url;
  if (typeof avatarUrl === "string" && avatarUrl.trim()) {
    return avatarUrl.trim();
  }

  const picture = user?.user_metadata?.picture;
  if (typeof picture === "string" && picture.trim()) {
    return picture.trim();
  }

  return null;
}
