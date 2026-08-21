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
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-busy={pending}
      aria-label="Booking records pagination"
      className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-5"
    >
      <PaginationLink
        disabled={pending || currentPage <= 1}
        onNavigate={onPageChange}
        page={1}
        queryString={queryString}
      >
        First
      </PaginationLink>

      {pageNumbers.map((page) => (
        <PaginationLink
          active={page === currentPage}
          compact
          disabled={pending}
          key={page}
          onNavigate={onPageChange}
          page={page}
          queryString={queryString}
        >
          {String(page)}
        </PaginationLink>
      ))}

      <PaginationLink
        disabled={pending || currentPage >= totalPages}
        onNavigate={onPageChange}
        page={totalPages}
        queryString={queryString}
      >
        Last
      </PaginationLink>

      <p
        aria-live="polite"
        className="basis-full text-center text-xs font-semibold text-zinc-500"
      >
        {pending ? "Loading page..." : `Page ${currentPage} of ${totalPages}`}
      </p>
    </nav>
  );
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  const visiblePageCount = Math.min(5, totalPages);
  let startPage = Math.max(1, currentPage - Math.floor(visiblePageCount / 2));
  const endPage = Math.min(totalPages, startPage + visiblePageCount - 1);

  startPage = Math.max(1, endPage - visiblePageCount + 1);

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );
}
