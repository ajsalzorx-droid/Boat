"use client";

import { useState, type ReactNode } from "react";
import { Bookmark, Check, Copy, LayoutGrid, Mail, Search, Send, X } from "lucide-react";
import { MENU_BOOK_PAGES } from "@/data/menu-book";
import { MENU_BOOK_PAGE_COUNT, MENU_BOOK_RATIO, menuBookImage, menuBookViews } from "@/lib/menu-book";

// The panels of the menu book's toolbar (src/components/MenuBook.tsx): pages, share and search

const TOTAL = MENU_BOOK_PAGE_COUNT;
const BOOKMARKS_KEY = "menu-book-bookmarks";

// Thumbnails of every page, and the reader's bookmarks (kept in this browser)
export function PagesPanel({ current, onPick, onClose }: { current: number; onPick: (i: number) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"pages" | "bookmarks">("pages");
  const [marks, setMarks] = useState<number[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? "[]");
      return Array.isArray(saved) ? saved.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < TOTAL) : [];
    } catch {
      return [];
    }
  });
  const save = (list: number[]) => {
    setMarks(list);
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    } catch {} // private window: kept until the panel closes
  };
  const marked = marks.includes(current);
  const tabClass = (on: boolean) => `flex flex-1 items-center justify-center rounded-[5px] py-1.5 ${on ? "" : "opacity-50 hover:opacity-100"}`;

  return (
    <div className="absolute inset-x-3 top-4 bottom-20 z-30 flex flex-col rounded-[5px] bg-white/95 p-4 text-neutral-800 shadow-lg sm:right-auto sm:left-[30px] sm:w-[360px]">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex flex-1 rounded-[5px] bg-black/5">
          <button type="button" aria-label="Page thumbnails" aria-pressed={tab === "pages"} className={tabClass(tab === "pages")} onClick={() => setTab("pages")}>
            <LayoutGrid size={26} strokeWidth={1.8} />
          </button>
          <button type="button" aria-label="Bookmarks" aria-pressed={tab === "bookmarks"} className={tabClass(tab === "bookmarks")} onClick={() => setTab("bookmarks")}>
            <Bookmark size={26} strokeWidth={1.8} />
          </button>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 hover:bg-black/10">
          <X size={20} />
        </button>
      </div>

      <div data-own-scroll data-lenis-prevent className="contents-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "pages" &&
          menuBookViews(true).map((view) => (
            <div key={view[0]} className="mb-4 flex justify-center">
              {view.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(i)}
                  aria-label={`Page ${i + 1}: ${MENU_BOOK_PAGES[i].title}`}
                  className={`w-[88px] transition-opacity hover:opacity-100 ${view.includes(current) ? "opacity-70" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={menuBookImage(i, true)} alt="" loading="lazy" className="block w-full" style={{ aspectRatio: MENU_BOOK_RATIO }} />
                </button>
              ))}
            </div>
          ))}
        {tab === "bookmarks" && (
          <>
            <button
              type="button"
              onClick={() => save(marked ? marks.filter((m) => m !== current) : [...marks, current].sort((a, b) => a - b))}
              className="mb-3 w-full rounded-[5px] border border-black/20 py-2 text-sm hover:bg-black/5"
            >
              {marked ? "Remove bookmark from this page" : "Bookmark this page"}
            </button>
            {marks.map((i) => (
              <button key={i} type="button" onClick={() => onPick(i)} className="flex w-full items-center gap-3 rounded-[5px] px-3 py-2 text-left text-sm hover:bg-black/5">
                <span className="w-6 tabular-nums opacity-50">{i + 1}</span> {MENU_BOOK_PAGES[i].title}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const Glyph = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" fillRule="evenodd" aria-hidden="true">
    <path d={d} />
  </svg>
);

const FACEBOOK = "M14 22v-8h3l.6-4H14V7.6c0-1.2.5-2 2.2-2h1.6V2.2C17.3 2.1 16.3 2 15.2 2c-2.7 0-4.7 1.7-4.7 5v3H7.2v4h3.3v8z";
const X_LOGO = "M3 3h5.6l4.3 5.9L18 3h2.3l-6.3 7.3L21 21h-5.6l-4.7-6.5L5.1 21H2.8l6.9-8zm3.2 1.7 9.9 14.6h1.8L8 4.7z";
const LINKEDIN =
  "M4 9h3.8v12H4zM5.9 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM10.2 9h3.6v1.7c.5-1 1.8-2 3.7-2 3.9 0 4.5 2.5 4.5 5.8V21h-3.8v-5.8c0-1.4 0-3.2-2-3.2s-2.2 1.5-2.2 3.1V21h-3.8z";
const PINTEREST =
  "M12 2a10 10 0 0 0-3.7 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.4-1.7-4.2-4.2-4.2a4.4 4.4 0 0 0-4.6 4.4c0 .9.3 1.8.8 2.3l-.4 1.4c-1.3-.6-2.1-2.5-2.1-4C5.6 8 8.2 5 12.5 5c3.5 0 6.2 2.5 6.2 5.8 0 3.5-2.2 6.3-5.2 6.3-1 0-2-.5-2.3-1.1l-.6 2.4c-.2.9-.8 1.9-1.2 2.6A10 10 0 1 0 12 2z";
const WHATSAPP =
  "M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zM8.6 7c.2 0 .4 0 .6.4l.9 2c.1.2 0 .4-.1.6l-.7.9c.6 1.4 2 2.6 3.6 3.3l.9-1c.2-.2.4-.2.6-.1l2 1c.3.2.4.3.3.6-.1 1.3-1.2 2.2-2.4 2.2-3.4 0-8-4-8-7.4C6.3 8.2 7.2 7 8.6 7z";

export function SharePanel() {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent("BOAT Seafood Restaurant menu");
  const image = encodeURIComponent(window.location.origin + menuBookImage(0));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {} // blocked: the address can still be selected by hand
  };
  const links: { name: string; href: string; icon: ReactNode }[] = [
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: <Glyph d={FACEBOOK} /> },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, icon: <Glyph d={X_LOGO} /> },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: <Glyph d={LINKEDIN} /> },
    { name: "Pinterest", href: `https://www.pinterest.com/pin/create/button/?url=${u}&media=${image}&description=${t}`, icon: <Glyph d={PINTEREST} /> },
    { name: "Email", href: `mailto:?subject=${t}&body=${u}`, icon: <Mail size={24} fill="currentColor" stroke="#fff" strokeWidth={1.4} /> },
    { name: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, icon: <Glyph d={WHATSAPP} /> },
    { name: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}`, icon: <Send size={23} fill="currentColor" stroke="#fff" strokeWidth={1.2} /> },
  ];
  return (
    <div className="absolute bottom-[74px] left-1/2 z-30 w-[400px] max-w-[calc(100%-24px)] -translate-x-1/2 rounded-[5px] bg-white/85 p-3 text-neutral-800 sm:bottom-[98px]">
      <div className="mb-3 flex justify-around">
        {links.map((l) => (
          <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`Share: ${l.name}`} title={l.name} className="hover:opacity-60">
            {l.icon}
          </a>
        ))}
      </div>
      <div className="flex overflow-hidden rounded-[5px] border border-black/10 bg-white">
        <input readOnly value={url} aria-label="Address of this page" onFocus={(e) => e.target.select()} className="min-w-0 flex-1 px-2 py-2 text-[13px] outline-none" />
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy address"} className="flex w-9 items-center justify-center bg-black text-white">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

// Search the sections and dishes of the menu
export function SearchPanel({ onPick, onClose }: { onPick: (i: number) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const has = (text: string) => text.toLowerCase().includes(needle);
  const results =
    needle.length < 2
      ? []
      : MENU_BOOK_PAGES.flatMap((p, page) =>
          p.sections.flatMap((s) => [...(has(s.name) ? [s.name] : []), ...s.dishes.filter(has)].map((text) => ({ page, section: s.name, text }))),
        );
  return (
    <div className="absolute bottom-[74px] left-1/2 z-30 w-[485px] max-w-[calc(100%-24px)] -translate-x-1/2 rounded-[5px] bg-white/85 p-2 text-neutral-800 sm:bottom-[98px]">
      {needle.length >= 2 && (
        <div data-own-scroll data-lenis-prevent className="contents-scroll mb-2 max-h-64 overflow-y-auto overscroll-contain rounded bg-white">
          <p className="px-2 py-1 text-xs opacity-60" aria-live="polite">
            {results.length ? `${results.length} ${results.length === 1 ? "result" : "results"}` : "No results"}
          </p>
          {results.map((r) => (
            <button
              key={`${r.page}-${r.section}-${r.text}`}
              type="button"
              onClick={() => onPick(r.page)}
              className="flex w-full items-baseline gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-black/5"
            >
              <span className="w-5 shrink-0 text-xs tabular-nums opacity-50">{r.page + 1}</span>
              <span className="flex-1">{r.text}</span>
              <span className="text-xs opacity-50">{r.section}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center rounded border border-black/10 bg-white">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && results.length) onPick(results[0].page);
          }}
          aria-label="Search the menu"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none"
        />
        <Search size={17} className="mx-4 shrink-0" aria-hidden />
      </div>
    </div>
  );
}
