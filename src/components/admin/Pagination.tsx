import { PaginationLink } from "./PaginationLink";

export function Pagination({
  currentPage,
  queryString,
  totalPages,
}: {
  currentPage: number;
  queryString?: string;
  totalPages: number;
}) {
  return (
    <nav className="mt-6 flex flex-col items-stretch gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <PaginationLink
        disabled={currentPage <= 1}
        page={currentPage - 1}
        queryString={queryString}
      >
        Previous
      </PaginationLink>
      <p className="order-first text-center text-xs font-semibold text-zinc-500 sm:order-none">
        Page {currentPage} of {totalPages}
      </p>
      <PaginationLink
        disabled={currentPage >= totalPages}
        page={currentPage + 1}
        queryString={queryString}
      >
        Next
      </PaginationLink>
    </nav>
  );
}
