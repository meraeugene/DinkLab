import type { ReactNode } from "react";

export function TabButton({
  active,
  count = 0,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-[0.7rem] font-bold transition",
        active
          ? "bg-white text-black"
          : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
      {count > 0 ? (
        <span
          className={[
            "ml-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.58rem] font-black",
            active ? "bg-black text-white" : "bg-white text-black",
          ].join(" ")}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
