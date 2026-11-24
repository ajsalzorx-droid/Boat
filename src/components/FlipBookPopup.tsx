"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import { useCart } from "@/context/CartContext";

// Shown every time the menu page opens: an invitation to the menu book (/menu-book).
// Not shown when a table's QR code opened the menu to order (skip).
//
// Two forms, for Google: a popup that covers the page right away on a phone counts as an
// "intrusive interstitial", which can lower the page in Google's mobile results. So on a phone,
// and for anyone arriving from a search engine, it is a small banner at the bottom that leaves the
// menu readable; the centred popup is only for computers, reached from inside the site.
const DELAY_MS = 900; // the menu shows first, then the invitation
const SEARCH_ENGINES = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia)\./i;

type Form = "popup" | "banner";

const chooseForm = (): Form => {
  let fromSearch = false;
  try {
    fromSearch = !!document.referrer && SEARCH_ENGINES.test(new URL(document.referrer).hostname);
  } catch {}
  const phone = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  return fromSearch || phone ? "banner" : "popup";
};

export default function FlipBookPopup({ skip = false }: { skip?: boolean }) {
  const [open, setOpen] = useState<Form | null>(null);
  const { cartCount } = useCart(); // on a phone the cart bar takes the bottom: the banner sits above it

  useEffect(() => {
    if (skip) return;
    const t = window.setTimeout(() => setOpen(chooseForm()), DELAY_MS);
    return () => clearTimeout(t);
  }, [skip]);

  useEffect(() => {
    if (open !== "popup") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open === "popup" && (
        <motion.div
          key="flipbook-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="flipbook-popup-title"
          className="fixed inset-0 z-[150] flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-2xl bg-cream px-7 py-8 text-center shadow-2xl font-jost"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-3 top-3 w-9 h-9 rounded-full flex items-center justify-center text-navy/60 hover:bg-navy/5 hover:text-navy"
            >
              <X size={18} />
            </button>
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-cream">
              <BookOpen size={26} aria-hidden />
            </span>
            <p className="text-[10px] tracking-[4px] uppercase text-ocean font-bold mb-2">BOAT Seafood Restaurant</p>
            <h2 id="flipbook-popup-title" className="font-playfair text-[26px] leading-tight font-bold text-navy mb-3">
              Open our menu book
            </h2>
            <p className="text-navy/75 text-[14px] mb-6">Turn the pages of our menu: fresh seafood, soups, salads and BOAT specials.</p>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/menu-book"
                autoFocus
                onClick={() => setOpen(null)}
                className="inline-flex items-center justify-center gap-2 bg-navy text-cream rounded-full px-7 py-3.5 text-[12px] tracking-[3px] uppercase font-bold hover:bg-ocean hover:text-navy transition-colors"
              >
                <BookOpen size={16} aria-hidden /> View menu book
              </Link>
              <button type="button" onClick={() => setOpen(null)} className="text-[12px] text-navy/60 underline underline-offset-2 hover:text-navy py-1">
                Continue to the menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* The small form: a strip at the bottom, clear of the floating buttons on the right; the menu
          stays readable and usable behind it */}
      {open === "banner" && (
        <motion.aside
          key="flipbook-banner"
          aria-label="Our menu as a flip book"
          className={`fixed left-3 right-[4.75rem] z-[45] md:left-6 md:right-auto md:max-w-sm md:bottom-6 font-jost ${cartCount > 0 ? "bottom-[6.5rem]" : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]"}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="flex items-center gap-2.5 rounded-2xl bg-cream pl-3 pr-1.5 py-2 shadow-[0_8px_24px_-8px_rgba(0,48,73,0.55)] border border-navy/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-cream">
              <BookOpen size={17} aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-[12px] leading-tight text-navy">
              <b className="block text-[13px]">Open our menu book</b>
              <span className="text-navy/65">Our menu as a flip book</span>
            </p>
            <Link
              href="/menu-book"
              onClick={() => setOpen(null)}
              className="shrink-0 rounded-full bg-navy text-cream px-3 py-2 text-[10.5px] tracking-[1.5px] uppercase font-bold hover:bg-ocean hover:text-navy transition-colors whitespace-nowrap"
            >
              View
            </Link>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-navy/55 hover:bg-navy/5 hover:text-navy">
              <X size={16} />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
