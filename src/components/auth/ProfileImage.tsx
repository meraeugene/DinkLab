import { UserRound } from "lucide-react";

export function ProfileImage({
  avatarUrl,
  displayName,
}: {
  avatarUrl?: string | null;
  displayName: string;
}) {
  if (avatarUrl) {
    return (
      <span
        aria-label={`${displayName} profile`}
        className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/15 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      >
        <span className="sr-only">{displayName}</span>
      </span>
    );
  }

  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06]">
      <UserRound className="h-4 w-4" />
    </span>
  );
}
