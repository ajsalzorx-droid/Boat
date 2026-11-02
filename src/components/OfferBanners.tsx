"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import type { OfferBanner } from "@/lib/offers";

// Homepage offers: the page opens on the hero; START_DELAY_MS later a hanging banner appears under
// the navbar: a wooden rod on two cords, from which the offer banner (Admin -> Offers) unrolls
// downwards like a fabric scroll, sways a little and pops confetti. Each stays SLIDE_MS, then rolls
// back up (the next one unrolls in its place). Not shown at all when no live offer has a banner.
// The screen's shape picks the image: portrait (phones, upright tablets) the tall one,
// landscape (desktops, sideways tablets) the wide one (see offerBanners in menu-data.ts).
const START_DELAY_MS = 1000;
const SLIDE_MS = 5000;
const OFFERS_HREF = "/menu?offers";
// Longest single wait for the next offer end (browsers can't time more than ~24 days at once)
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;
const EASE = [0.16, 1, 0.3, 1] as const;
// How long the banner takes to unroll / roll back up (seconds)
const UNROLL_S = 1.4;
const ROLL_UP_S = 0.8;
// Space under the navbar for the cords and rod, and under the banner for its buttons (px)
const ROD_SPACE_PX = 34;
// The rod (12px thick) sits this far under the navbar; the banner's top edge starts behind it
const ROD_TOP_PX = 22;
const BANNER_TOP_PX = ROD_TOP_PX + 3;
// Rod, cords and banner swing together (one damped swing once a banner is open) around the
// middle of the rod, so the banner always stays on the rod
const ROD_MID_PX = ROD_TOP_PX + 6;
const SWAY = { rotate: [0, 0.5, -0.32, 0.15, 0] };
const SWAY_DELAY_S = 0.25 + UNROLL_S - 0.2;
const SWAY_S = 2.2;
const BUTTONS_SPACE_PX = 84;
// Phones get more breathing room: narrower banner, bigger gap above its buttons
const BUTTONS_SPACE_PHONE_PX = 108;
const BUTTONS_GAP_PX = 18;
const BUTTONS_GAP_PHONE_PX = 30;
// Confetti in the site's colours: ocean, cream, offer red, gold, white
const CONFETTI_COLORS = ["#669bbc", "#fdf0d5", "#c1121f", "#C49A3C", "#ffffff"];
const CONFETTI_PER_SIDE = 32;

// Same "random" numbers every time for a given piece (0..1)
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Two party poppers in the bottom corners shoot confetti up and inward; it then falls and fades
function Confetti({ delay }: { delay: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {(["left", "right"] as const).map((side) =>
        Array.from({ length: CONFETTI_PER_SIDE }, (_, k) => {
          const i = k + (side === "right" ? CONFETTI_PER_SIDE : 0);
          const dir = side === "left" ? 1 : -1;
          const reach = 0.25 + rand(i, 1) * 0.45; // how far across the screen (share of its width)
          const rise = 0.35 + rand(i, 2) * 0.45; // how high (share of its height)
          const size = 7 + rand(i, 3) * 8;
          const round = rand(i, 4) > 0.6;
          const duration = 1.6 + rand(i, 5) * 0.9;
          return (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
              animate={{
                x: [0, `${dir * reach * 100}vw`, `${dir * (reach + 0.05) * 100}vw`],
                y: [0, `${-rise * 100}vh`, `${(-rise + 0.45) * 100}vh`],
                rotate: [0, dir * (180 + rand(i, 6) * 540)],
                opacity: [1, 1, 0],
              }}
              transition={{ duration, delay: delay + rand(i, 7) * 0.15, ease: "easeOut", times: [0, 0.45, 1] }}
              className={`absolute bottom-4 ${side === "left" ? "left-4" : "right-4"} block`}
              style={{
                width: size,
                height: round ? size : size * 1.8,
                borderRadius: round ? "9999px" : "2px",
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              }}
            />
          );
        })
      )}
    </div>
  );
}

// A round wooden bar with knobs at both ends (the rod the banner hangs from)
function Bar({ width, thick }: { width: number; thick: number }) {
  return (
    <div className="relative" style={{ width, height: thick }}>
      <div
        className="absolute inset-0 rounded-full shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
        style={{ background: "linear-gradient(180deg,#a4713f 0%,#7a4b23 45%,#4e2d12 100%)" }}
      />
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className={`absolute top-1/2 -translate-y-1/2 rounded-full shadow-md ${side === "left" ? "-left-2" : "-right-2"}`}
          style={{ width: thick + 8, height: thick + 8, background: "radial-gradient(circle at 35% 35%,#c9a46a,#7a4b23 60%,#3e2410)" }}
        />
      ))}
    </div>
  );
}

export default function OfferBanners({ banners: all }: { banners: OfferBanner[] }) {
  const [index, setIndex] = useState(0);
  // Shown once per page visit: closed at first (the hero shows), opened START_DELAY_MS later,
  // closed for good after the last banner (or the close icon)
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  // Where the navbar ends (px from the top) and the screen size: the banner is sized to fit
  const [layout, setLayout] = useState({ top: 0, w: 1280, h: 800, portrait: false });
  // Shape (width / height) of each banner image as it shows on this screen, once downloaded
  const [ratios, setRatios] = useState<Record<string, number>>({});
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

  // Download every banner this screen will show right away (so each one is ready when it comes),
  // and note its shape for sizing the hanging banner
  useEffect(() => {
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    all.forEach((b) => {
      const img = new Image();
      img.onload = () => setRatios((r) => ({ ...r, [b.id]: img.naturalWidth / img.naturalHeight }));
      img.src = portrait ? b.tall : b.wide;
    });
  }, [all]);

  // Measures where the navbar ends and the screen size (again whenever the window resizes)
  useEffect(() => {
    const measure = () =>
      setLayout({
        top: Math.max(0, document.querySelector(".site-navbar")?.getBoundingClientRect().bottom ?? 0),
        w: window.innerWidth,
        h: window.innerHeight,
        portrait: window.matchMedia("(orientation: portrait)").matches,
      });
    const first = window.setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(first);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // The hero shows first; the banner comes START_DELAY_MS after the page opens
  const hasBanners = all.length > 0;
  useEffect(() => {
    if (!hasBanners || started) return;
    const t = window.setTimeout(() => {
      // The navbar may have moved since the page opened (it shifts up a little once scrolled)
      setLayout((l) => ({ ...l, top: Math.max(0, document.querySelector(".site-navbar")?.getBoundingClientRect().bottom ?? l.top) }));
      setStarted(true);
      setOpen(true);
    }, START_DELAY_MS);
    return () => clearTimeout(t);
  }, [hasBanners, started]);

  // Each banner unrolls, stays SLIDE_MS, then the next one comes (or all roll up after the last)
  useEffect(() => {
    if (!showing) return;
    const t = window.setTimeout(() => {
      if (index < banners.length - 1) setIndex(index + 1);
      else setOpen(false);
    }, SLIDE_MS + UNROLL_S * 1000);
    return () => clearTimeout(t);
  }, [showing, index, banners.length]);

  // While the banners show: the page behind doesn't scroll, and Escape skips them.
  // Scrolling is blocked at the wheel, touch and keys rather than with overflow: hidden, which
  // would remove the scrollbar for a moment and make the whole page jump sideways.
  useEffect(() => {
    if (!showing) return;
    const SCROLL_KEYS = [" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"];
    const stop = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (SCROLL_KEYS.includes(e.key) && !(e.target instanceof HTMLElement && e.target.closest("a,button"))) e.preventDefault();
    };
    window.addEventListener("wheel", stop, { passive: false });
    window.addEventListener("touchmove", stop, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
    };
  }, [showing]);

  // Visitors who ask their device for less motion get a plain fade (no unroll, sway or confetti)
  const calm = useReducedMotion();

  const current = banners.length ? Math.min(index, banners.length - 1) : 0; // an offer may have just ended
  const banner = banners[current];

  // The banner as big as fits between the rod and the buttons, in its own shape
  const ratio = (banner && ratios[banner.id]) || (layout.portrait ? 0.5 : 16 / 9);
  const availW = layout.w * (layout.portrait ? 0.78 : 0.92);
  const availH = layout.h - layout.top - ROD_SPACE_PX - (layout.portrait ? BUTTONS_SPACE_PHONE_PX : BUTTONS_SPACE_PX);
  const bannerW = Math.round(Math.max(160, Math.min(availW, availH * ratio)));
  const bannerH = Math.round(bannerW / ratio);
  const rodW = bannerW + 28;

  return (
    <AnimatePresence>
      {showing && banner && (
        <motion.section
          key="offer-banners"
          id="offer-banners"
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-roledescription="carousel"
          aria-label="Today's offers"
          // Under the navbar (which stays on top)
          style={{ top: layout.top }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, delay: ROLL_UP_S } }}
          className="fixed inset-x-0 bottom-0 z-[48] overflow-hidden"
        >
          {/* The hero darkens softly behind the hanging banner */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-ink/80"
          />

          {/* Cords from the navbar to the rod, and the rod itself (in front of the banner's top edge) */}
          <motion.div
            className="absolute z-20 left-1/2 top-0"
            style={{ width: rodW, marginLeft: -rodW / 2 }}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
          >
            {/* Swings with the banner (restarts for each banner) */}
            <motion.div
              key={`sway-${banner.id}`}
              className="absolute inset-x-0 top-0"
              style={{ transformOrigin: `50% ${ROD_MID_PX}px` }}
              animate={calm ? undefined : SWAY}
              transition={{ duration: SWAY_S, delay: SWAY_DELAY_S, ease: "easeInOut" }}
            >
              {/* The cords start above the screen edge, so they stay attached while swinging */}
              <div aria-hidden className="absolute inset-x-6 flex justify-between" style={{ top: -14, height: ROD_TOP_PX + 16 }}>
                <span className="w-[2px] h-full bg-[#c9a46a]/80" />
                <span className="w-[2px] h-full bg-[#c9a46a]/80" />
              </div>
              <div className="absolute z-10 left-0" style={{ top: ROD_TOP_PX }}>
                <Bar width={rodW} thick={12} />
              </div>
            </motion.div>
          </motion.div>

          {/* The banner unrolls down from the rod,
              sways a little once open, and rolls back up when its time is over */}
          <AnimatePresence mode="wait">
            <motion.div
              key={banner.id}
              className="absolute left-1/2"
              style={{ top: BANNER_TOP_PX, width: bannerW, height: bannerH, marginLeft: -bannerW / 2, transformOrigin: `50% ${ROD_MID_PX - BANNER_TOP_PX}px` }}
              initial={{ rotate: 0 }}
              // Same swing and pivot as the rod above
              animate={calm ? { rotate: 0 } : SWAY}
              transition={{ duration: SWAY_S, delay: SWAY_DELAY_S, ease: "easeInOut" }}
              exit={{ opacity: 1, transition: { duration: ROLL_UP_S } }}
              aria-roledescription="slide"
              aria-label={`${current + 1} of ${banners.length}: ${banner.title}`}
            >
              <motion.div
                className="absolute inset-0 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                initial={calm ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
                animate={calm ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" }}
                exit={calm ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)", transition: { duration: ROLL_UP_S, ease: [0.65, 0, 0.35, 1] } }}
                transition={{ duration: UNROLL_S, delay: 0.25, ease: [0.33, 1, 0.68, 1] }}
              >
                <Link href={OFFERS_HREF} aria-label={`${banner.title}: view offers`} className="block w-full h-full">
                  <picture>
                    <source media="(orientation: portrait)" srcSet={banner.tall} />
                    <img src={banner.wide} alt={banner.title} className="w-full h-full object-cover select-none" draggable={false} />
                  </picture>
                </Link>
                {/* Soft fabric shading: lighter in the middle, darker at the edges */}
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.18),transparent_12%,transparent_88%,rgba(0,0,0,0.18))]" />
              </motion.div>

            </motion.div>
          </AnimatePresence>

          {!calm && <Confetti key={`pop-${banner.id}`} delay={0.25 + UNROLL_S - 0.15} />}

          {/* Buttons fade up once the banner is open: a close icon at the banner's top right, and
              View More Offers with the dots under it */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 + UNROLL_S, ease: EASE }}
            className="absolute inset-0 z-30 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close offers"
              title="Close"
              className="absolute flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/55 backdrop-blur-md text-white shadow-lg ring-1 ring-white/25 hover:bg-black/75 transition-colors"
              // Inside the banner's top-right corner, just under the rod
              style={{ top: BANNER_TOP_PX + 18, left: `calc(50% + ${bannerW / 2 - (layout.portrait ? 46 : 54)}px)` }}
            >
              <X size={18} />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-3" style={{ top: BANNER_TOP_PX + bannerH + (layout.portrait ? BUTTONS_GAP_PHONE_PX : BUTTONS_GAP_PX) }}>
              <div className="flex items-center gap-2.5">
              <Link
                href={OFFERS_HREF}
                className="group inline-flex items-center gap-3 whitespace-nowrap bg-cream text-navy rounded-lg py-3 px-7 md:px-9 font-jost text-[10px] md:text-[11px] font-bold tracking-[2.5px] uppercase no-underline shadow-2xl transition-colors duration-300 hover:bg-ocean"
              >
                View More Offers
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
              </Link>
              </div>
              {banners.length > 1 && (
                <div className="flex gap-2">
                  {banners.map((b, i) => (
                    <span key={b.id} aria-hidden className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
