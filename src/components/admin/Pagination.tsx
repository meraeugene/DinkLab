import { PaginationLink } from "./PaginationLink";

export function Pagination({
  currentPage,
  onPageChange,
  pending = false,
  queryString,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pending?: boolean;
  queryString?: string;
  totalPages: number;
}) {
  return (
    <nav
      aria-busy={pending}
      aria-label="Booking records pagination"
      className="mt-6 flex flex-col items-stretch gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <PaginationLink
        disabled={pending || currentPage <= 1}
        onNavigate={onPageChange}
        page={currentPage - 1}
        queryString={queryString}
      >
        Previous
      </PaginationLink>
      <p className="order-first text-center text-xs font-semibold text-zinc-500 sm:order-none">
        {pending ? "Loading next page..." : `Page ${currentPage} of ${totalPages}`}
      </p>
      <PaginationLink
        disabled={pending || currentPage >= totalPages}
        onNavigate={onPageChange}
        page={currentPage + 1}
        queryString={queryString}
      >
        Next
      </PaginationLink>
    </nav>
  );
}
