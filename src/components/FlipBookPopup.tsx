"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, X } from "lucide-react";

// Shown every time the menu page opens (from the navbar, a link, or typed in): an invitation to the
// profile flip book (/profile, Heyzine). Not shown when a table's QR code opened the menu to order
// (skip), so it never stands between a guest and their order.
const DELAY_MS = 900; // the menu shows first, then the popup

export default function FlipBookPopup({ skip = false }: { skip?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (skip) return;
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [skip]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="flipbook-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="flipbook-popup-title"
          className="fixed inset-0 z-[150] flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
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
              onClick={() => setOpen(false)}
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
              Discover our story
            </h2>
            <p className="text-navy/75 text-[14px] mb-6">Turn the pages of our profile: our seafood, our kitchen and the BOAT experience.</p>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/profile"
                autoFocus
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 bg-navy text-cream rounded-full px-7 py-3.5 text-[12px] tracking-[3px] uppercase font-bold hover:bg-ocean hover:text-navy transition-colors"
              >
                <BookOpen size={16} aria-hidden /> View flip book
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-navy/60 underline underline-offset-2 hover:text-navy py-1">
                Continue to the menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
