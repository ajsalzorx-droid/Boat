"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import type { OfferBanner } from "@/lib/offers";

// Homepage offers: the page opens on the hero; START_DELAY_MS later the banners added in
// Admin -> Offers slide in over it, one after another: each comes in from the right and stays SLIDE_MS, the next pushes it
// out to the left, and after the last one (or the only one) the banner slides away to the left,
// showing the hero and the navbar. Not shown at all when no live offer has a banner.
// The screen's shape picks the image: portrait (phones, upright tablets) the tall one,
// landscape (desktops, sideways tablets) the wide one (see offerBanners in menu-data.ts).
const START_DELAY_MS = 3000;
const SLIDE_MS = 5000;
const OFFERS_HREF = "/menu?offers";
// Longest single wait for the next offer end (browsers can't time more than ~24 days at once)
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;
const EASE = [0.16, 1, 0.3, 1] as const;

export default function OfferBanners({ banners: all }: { banners: OfferBanner[] }) {
  const [index, setIndex] = useState(0);
  // Shown once per page visit: closed at first (the hero shows), opened START_DELAY_MS later,
  // closed for good after the last banner (or Skip)
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  // The page HTML can be a few minutes old (and a tab can stay open for hours): the browser
  // checks the end dates too, so an offer disappears the moment it ends. null = not checked yet
  // (first render matches the server HTML).
  const [now, setNow] = useState<number | null>(null);

  // Checks once at load, then again right when the next offer ends
  useEffect(() => {
    const at = now ?? 0;
    const nextEnd = Math.min(...all.map((b) => (b.endsAt ? Date.parse(b.endsAt) : Infinity)).filter((t) => t >= at));
    const wait = now === null ? 0 : nextEnd === Infinity ? null : Math.min(nextEnd - Date.now() + 50, MAX_WAIT_MS);
    if (wait === null) return;
    const t = window.setTimeout(() => setNow(Date.now()), Math.max(wait, 0));
    return () => clearTimeout(t);
  }, [all, now]);

  const banners = now === null ? all : all.filter((b) => !b.endsAt || Date.parse(b.endsAt) >= now);
  const showing = open && banners.length > 0;

  // The hero shows first; the banners come in START_DELAY_MS after the page opens
  const hasBanners = all.length > 0;
  useEffect(() => {
    if (!hasBanners || started) return;
    const t = window.setTimeout(() => {
      setStarted(true);
      setOpen(true);
    }, START_DELAY_MS);
    return () => clearTimeout(t);
  }, [hasBanners, started]);

  // Download every banner this screen will show right away, so each slide is ready when it comes
  useEffect(() => {
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    all.forEach((b) => {
      new Image().src = portrait ? b.tall : b.wide;
    });
  }, [all]);

  // Each banner stays SLIDE_MS; after the last one the banners leave to the left
  useEffect(() => {
    if (!showing) return;
    const t = window.setTimeout(() => {
      if (index < banners.length - 1) setIndex(index + 1);
      else setOpen(false);
    }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [showing, index, banners.length]);

  // While the banners show: the page behind doesn't scroll, and Escape skips them
  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = overflow;
    };
  }, [showing]);

  // Visitors who ask their device for less motion get the plain slide (no zoom or shine)
  const calm = useReducedMotion();

  const current = banners.length ? Math.min(index, banners.length - 1) : 0; // an offer may have just ended
  const banner = banners[current];

  return (
    <AnimatePresence>
      {showing && banner && (
        <motion.section
          key="offer-banners"
          // The navbar is hidden while this is on the page (globals.css, #offer-banners)
          id="offer-banners"
          data-covering-nav="true"
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-roledescription="carousel"
          aria-label="Today's offers"
          // The whole banner leaves to the left when done, showing the hero
          exit={{ x: "-100%" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="fixed inset-0 z-[70] overflow-hidden"
        >
          {/* The hero darkens softly as the banner arrives */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-ink/90"
          />

          {/* Each banner comes in from the right (settling from a slight zoom) and goes out to the left */}
          <AnimatePresence initial={true}>
            <motion.div
              key={banner.id}
              initial={{ x: "100%", scale: calm ? 1 : 1.04 }}
              animate={{ x: 0, scale: 1 }}
              exit={{ x: "-100%", opacity: 0.6 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="absolute inset-0 overflow-hidden shadow-2xl"
              aria-roledescription="slide"
              aria-label={`${current + 1} of ${banners.length}: ${banner.title}`}
            >
              <Link href={OFFERS_HREF} aria-label={`${banner.title}: view offers`} className="block w-full h-full">
                {/* Slow zoom while it shows, so the banner feels alive */}
                <motion.div
                  initial={{ scale: calm ? 1 : 1.08 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: SLIDE_MS / 1000 + 1, ease: "easeOut" }}
                  className="w-full h-full"
                >
                  <picture>
                    <source media="(orientation: portrait)" srcSet={banner.tall} />
                    <img src={banner.wide} alt={banner.title} className="w-full h-full object-cover select-none" draggable={false} />
                  </picture>
                </motion.div>
              </Link>
              {/* A soft light sweeps across once, right after the banner lands */}
              {!calm && (
                <motion.div
                  aria-hidden
                  initial={{ x: "-120%" }}
                  animate={{ x: "320%" }}
                  transition={{ duration: 1.3, delay: 0.85, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Buttons and dots fade up just after the banner lands */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
            className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto"
          >

          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 md:top-6 md:right-6 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-md text-white rounded-full pl-4 pr-3 py-2 text-[11px] font-bold tracking-[2px] uppercase hover:bg-black/60 transition-colors"
          >
            Skip <X size={16} />
          </button>

          {banners.length > 1 && (
            // Dots: bottom centre, show which offer is on screen
            <div className="absolute bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1.5">
              {banners.map((b, i) => (
                <span key={b.id} aria-hidden className={`h-2.5 rounded-full transition-all ${i === current ? "w-7 bg-white" : "w-2.5 bg-white/60"}`} />
              ))}
            </div>
          )}

          {/* Bottom centre on portrait screens (raised above the dots when several offers show),
              bottom left on landscape ones */}
          <Link
            href={OFFERS_HREF}
            className={`group absolute z-10 ${banners.length > 1 ? "bottom-11" : "bottom-5"} left-1/2 -translate-x-1/2 landscape:left-8 landscape:translate-x-0 landscape:bottom-8 inline-flex items-center gap-3 whitespace-nowrap bg-navy text-cream rounded-lg py-3.5 px-7 md:py-4 md:px-9 font-jost text-[10px] md:text-[11px] font-bold tracking-[2.5px] uppercase no-underline shadow-2xl transition-colors duration-300 hover:bg-ocean hover:text-navy`}
          >
            View More Offers
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
          </Link>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
