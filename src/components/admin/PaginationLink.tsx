import Link from "next/link";

export function PaginationLink({
  children,
  disabled,
  page,
  queryString,
}: {
  children: string;
  disabled: boolean;
  page: number;
  queryString?: string;
}) {
  const className =
    "inline-flex h-11 w-full min-w-28 cursor-pointer items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-black uppercase tracking-[0.16em] transition sm:h-10 sm:w-auto";

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
    >
      {children}
    </Link>
  );
}
