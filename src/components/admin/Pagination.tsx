import { PaginationLink } from "./PaginationLink";

export function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  return (
    <nav className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
      <PaginationLink disabled={currentPage <= 1} page={currentPage - 1}>
        Previous
      </PaginationLink>
      <p className="shrink-0 text-xs font-semibold text-zinc-500">
        Page {currentPage} of {totalPages}
      </p>
      <PaginationLink
        disabled={currentPage >= totalPages}
        page={currentPage + 1}
      >
        Next
      </PaginationLink>
    </nav>
  );
}
