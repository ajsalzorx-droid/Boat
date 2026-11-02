"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

// Page numbers to show, with "…" gaps once there are many pages (0-based pages)
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set([0, total - 1, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < total).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

// "Showing 1–8 of 23 items" plus Prev / page numbers / Next (pages are 0-based)
export default function Pagination({
  page,
  pageSize,
  total,
  onPage,
  disabled = false,
  noun = "items",
  label,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  disabled?: boolean;
  noun?: string;
  label: string;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstShown = page * pageSize + 1;
  const lastShown = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3">
      <p className="text-sm text-gray-500">
        Showing <span className="font-semibold text-navy">{firstShown}–{lastShown}</span> of{" "}
        <span className="font-semibold text-navy">{total}</span> {noun}
      </p>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label={label}>
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 0 || disabled}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-navy hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-2 text-gray-400 text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                disabled={disabled}
                aria-current={p === page ? "page" : undefined}
                className={`min-w-9 h-9 px-2 rounded-lg text-sm font-semibold transition-all ${
                  p === page
                    ? "bg-navy text-white shadow-sm"
                    : "text-navy hover:bg-white hover:shadow-sm"
                }`}
              >
                {p + 1}
              </button>
            )
          )}

          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages - 1 || disabled}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-navy hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
