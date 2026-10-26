"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { OfferBanner } from "@/lib/offers";

// Homepage offers section (the first thing on the page, above the hero): the banners added in
// Admin -> Offers, each filling the section as a background image. Several offers slide by as
// a carousel. Not on the page at all when no live offer has a banner.
// The screen's shape picks the image: portrait (phones, upright tablets) the tall one,
// landscape (desktops, sideways tablets) the wide one (see offerBanners in menu-data.ts).
const SLIDE_MS = 5000;
const OFFERS_HREF = "/menu?offers";
// Swipe further than this (px) to change slide
const SWIPE_PX = 50;
// Longest single wait for the next offer end (browsers can't time more than ~24 days at once)
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;

export default function OfferBanners({ banners: all }: { banners: OfferBanner[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
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
  const many = banners.length > 1;

  const go = (next: number, dir: number) => {
    setDirection(dir);
    setIndex((next + banners.length) % banners.length);
  };

  // Auto-advance; waits while a mouse is over it, and restarts its time after every change
  useEffect(() => {
    if (!many || paused) return;
    const t = window.setTimeout(() => go(index + 1, 1), SLIDE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, many]);

  if (!banners.length) return null;
  const current = index % banners.length; // an offer may have just ended
  const banner = banners[current];

  return (
    // The navbar is fixed over the top of the page: this dark strip sits under it, so the
    // banner starts below the navbar (heights match the navbar: 92px phone, 137px from md)
    <div className="bg-ink pt-[92px] md:pt-[137px]">
    <section
      aria-roledescription="carousel"
      aria-label="Offers"
      // Only a real mouse pauses it (a tap on a phone would otherwise pause it for good)
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
      // Portrait: as tall as the banner (set by the invisible copy below), whole artwork shown.
      // Landscape: full width, 16:9 tall but never taller than one screen under the navbar. The wide
      // image is padded to 7:2 in the banner's border colour (fitWide in menu-data.ts), so filling the
      // width only trims that padding: the whole banner stays visible
      className="relative w-full overflow-hidden bg-navy portrait:min-h-[60svh] landscape:h-[min(56.25vw,calc(100svh-92px))] md:landscape:h-[min(56.25vw,calc(100svh-137px))]"
    >
      {/* Portrait: an invisible copy of the tall banner sets the height, so a banner taller than
          9:16 grows the section and shows whole (nothing cut at the top or bottom) */}
      <img src={banner.tall} alt="" aria-hidden className="invisible block w-full h-auto landscape:hidden" />

      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={banner.id}
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: `${d * 100}%` }),
            center: { x: 0 },
            exit: (d: number) => ({ x: `${d * -100}%` }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          drag={many ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_PX) go(current + 1, 1);
            else if (info.offset.x > SWIPE_PX) go(current - 1, -1);
          }}
          className="absolute inset-0"
          aria-roledescription="slide"
          aria-label={`${current + 1} of ${banners.length}: ${banner.title}`}
        >
          <Link href={OFFERS_HREF} draggable={false} aria-label={`${banner.title}: view offers`} className="block w-full h-full">
            <picture>
              <source media="(orientation: portrait)" srcSet={banner.tall || banner.wide} />
              <img
                src={banner.wide || banner.tall}
                alt={banner.title}
                draggable={false}
                loading={current === 0 ? "eager" : "lazy"}
                // Portrait: pinned to the top so the logo and heading are never cut (any crop is at the bottom)
                className="w-full h-full object-cover portrait:object-top select-none"
              />
            </picture>
          </Link>
        </motion.div>
      </AnimatePresence>

      {many && (
        <>
          <button
            onClick={() => go(current - 1, -1)}
            aria-label="Previous offer"
            className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/80 text-navy items-center justify-center shadow-lg hover:bg-white transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => go(current + 1, 1)}
            aria-label="Next offer"
            className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/80 text-navy items-center justify-center shadow-lg hover:bg-white transition-colors"
          >
            <ChevronRight size={22} />
          </button>
          {/* Dots: at the top on portrait screens (the button is at the bottom), bottom centre on landscape */}
          <div className="absolute top-4 landscape:top-auto landscape:bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i, i > current ? 1 : -1)}
                aria-label={`Show offer ${i + 1}: ${b.title}`}
                aria-current={i === current}
                className={`h-2.5 rounded-full transition-all ${i === current ? "w-7 bg-white" : "w-2.5 bg-white/60 hover:bg-white"}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Bottom centre on portrait screens (under the banner text), bottom left on landscape
          ones (on the side area, clear of the artwork and of the floating buttons on the right) */}
      <Link
        href={OFFERS_HREF}
        className="group absolute z-10 bottom-5 left-1/2 -translate-x-1/2 landscape:left-8 landscape:translate-x-0 landscape:bottom-8 inline-flex items-center gap-3 whitespace-nowrap bg-navy text-cream rounded-lg py-3.5 px-7 md:py-4 md:px-9 font-jost text-[10px] md:text-[11px] font-bold tracking-[2.5px] uppercase no-underline shadow-2xl transition-colors duration-300 hover:bg-ocean hover:text-navy"
      >
        View More Offers
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
      </Link>
    </section>
    </div>
  );
}
