"use client";

import { useEffect, useState } from "react";
import { actionFailed } from "./client-helpers";
import { toast } from "./Toaster";

// Server-side search for the admin screens (Menu, Daily Catch, Game Claims), without lag.
// - useDebouncedSearch: typing is debounced (DEBOUNCE_MS), so the server is asked once the
//   user pauses, not on every key. Enter searches straight away.
// - useAbortableFetch: every request gets its own AbortController. A newer search, page or
//   reload aborts the one still running, so an old, slow answer can never replace newer
//   results. Requests that hang are aborted after TIMEOUT_MS and the user is told.
//   The data on screen stays until the new answer arrives (no "Loading..." flash).
// - useAdminList: both together for a paged table.

const DEBOUNCE_MS = 300;
const TIMEOUT_MS = 15_000;

type ApiResult<D> = { ok: true; data: D } | { ok: false; error: string; status?: number };

export function useDebouncedSearch(onSearch?: (query: string) => void) {
  const [input, setInput] = useState(""); // what is in the search box
  const [query, setQuery] = useState(""); // what was last searched

  const run = (q: string) => {
    setQuery(q);
    onSearch?.(q);
  };

  useEffect(() => {
    const q = input.trim();
    if (q === query) return;
    const timer = setTimeout(() => run(q), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only changes state
  }, [input, query]);

  return {
    /** The text in the box */
    search: input,
    setSearch: setInput,
    /** The search the results are for */
    query,
    /** Typed but not searched yet (typing hasn't paused) */
    typing: input.trim() !== query,
    /** Enter: search now, don't wait for the pause */
    searchNow: () => {
      const q = input.trim();
      if (q !== query) run(q);
    },
    clearSearch: () => {
      setInput("");
      if (query) run("");
    },
  };
}

// GET `url` (an /api/admin route) whenever it changes or reload() is called.
// `pending`: a request is on its way. `changing`: the url differs from the data on screen
// (a new search, filter or page, not a background refresh).
export function useAbortableFetch<D>(url: string, opts: { onData?: (data: D) => boolean | void } = {}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<D | null>(null);
  const [shown, setShown] = useState<{ url: string; key: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);
    // A background refresh of what is already on screen only reports a lost login, not every
    // hiccup (it runs again soon); a new search/page reports any error.
    const refresh = shown?.url === url;

    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json() as Promise<ApiResult<D>>)
      .then((res) => {
        if (!res.ok) {
          if (!refresh || res.status === 401) actionFailed(res);
          setShown({ url, key: reloadKey });
          return;
        }
        // onData can return false to skip these rows (e.g. it moved to another page instead)
        if (opts.onData?.(res.data) === false) return;
        setData(res.data);
        setShown({ url, key: reloadKey });
      })
      .catch(() => {
        // Aborted because something newer was asked for: nothing to tell anyone
        if (controller.signal.aborted && !timedOut) return;
        if (!refresh)
          toast(timedOut ? "The server is taking too long. Please try again." : "Could not load the list. Check the connection and try again.", "error");
        setShown({ url, key: reloadKey });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only for a new url or reload
  }, [url, reloadKey]);

  return {
    data,
    /** Nothing loaded yet (first visit) */
    loading: shown === null,
    pending: shown?.url !== url || shown?.key !== reloadKey,
    changing: shown?.url !== url,
    /** Fetch again (after add, edit or delete, or a timed refresh) */
    reload: () => setReloadKey((k) => k + 1),
  };
}

// A paged admin table with search: GET endpoint?page&size&q -> { items, total }
export function useAdminList<T>(endpoint: string, pageSize: number) {
  const [page, setPage] = useState(0);
  const s = useDebouncedSearch(() => setPage(0)); // a new search starts on page 1

  const url = `${endpoint}?${new URLSearchParams({ page: String(page), size: String(pageSize), q: s.query })}`;
  const f = useAbortableFetch<{ items: T[]; total: number }>(url, {
    onData: ({ items, total }) => {
      // The page no longer exists (e.g. its items were deleted): go to the last one that does
      if (items.length === 0 && total > 0 && page > 0) {
        setPage(Math.max(Math.ceil(total / pageSize) - 1, 0));
        return false;
      }
    },
  });

  return {
    items: f.data?.items ?? [],
    total: f.data?.total ?? 0,
    page,
    query: s.query,
    loading: f.loading,
    /** A search or page is on its way (or typing hasn't paused yet) */
    busy: s.typing || f.pending,
    search: s.search,
    setSearch: s.setSearch,
    searchNow: s.searchNow,
    clearSearch: s.clearSearch,
    goToPage: setPage,
    reload: f.reload,
  };
}
