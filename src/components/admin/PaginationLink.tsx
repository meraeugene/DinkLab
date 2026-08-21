import Link from "next/link";

export function PaginationLink({
  active = false,
  children,
  compact = false,
  disabled,
  onNavigate,
  page,
  queryString,
}: {
  active?: boolean;
  children: string;
  compact?: boolean;
  disabled: boolean;
  onNavigate: (page: number) => void;
  page: number;
  queryString?: string;
}) {
  const className = [
    "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border px-3 text-xs font-black uppercase transition",
    compact ? "min-w-10 tracking-[0.08em]" : "min-w-20 tracking-[0.16em]",
  ].join(" ");

  if (active) {
    return (
      <span
        aria-current="page"
        className={`${className} cursor-default border-lime-300/40 bg-lime-300/15 text-lime-100`}
      >
        {children}
      </span>
    );
  }

  if (disabled) {
    return (
      <span className={`${className} cursor-not-allowed text-zinc-700`}>
        {children}
      </span>
    );
  }

  const params = new URLSearchParams(queryString || "");
  params.set("page", String(page));

  return (
    <Link
      className={`${className} bg-white/[0.04] text-zinc-200 hover:border-white/30 hover:bg-white/[0.08] hover:text-white`}
      href={`/admin?${params.toString()}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(page);
      }}
    >
      {children}
    </Link>
  );
}
