import Link from "next/link";

export function PaginationLink({
  children,
  disabled,
  page,
}: {
  children: string;
  disabled: boolean;
  page: number;
}) {
  const className =
    "inline-flex h-10 min-w-28 items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-black uppercase tracking-[0.16em] transition";

  if (disabled) {
    return (
      <span className={`${className} cursor-not-allowed text-zinc-700`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      className={`${className} bg-white/[0.04] text-zinc-200 hover:border-white/30 hover:bg-white/[0.08] hover:text-white`}
      href={`/admin?page=${page}`}
    >
      {children}
    </Link>
  );
}
