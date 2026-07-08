import { getInitial } from "@/utils/booking/bookingWidgetCalendar";

export function OccupiedAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl?: string;
  name: string;
}) {
  if (avatarUrl) {
    return (
      <span
        aria-label={`${name} profile`}
        className="h-5 w-5 shrink-0 rounded-full border border-white/15 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      />
    );
  }

  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[0.58rem] font-black text-black">
      {getInitial(name)}
    </span>
  );
}