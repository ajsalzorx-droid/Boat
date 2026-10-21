"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { Orientation, PageFlip } from "page-flip";
import { ChevronLeft, ChevronRight, List, Volume2, VolumeX, Maximize, Minimize, Share2, Check } from "lucide-react";

/**
 * Magazine-style flip book (3D page curl, shadows, swipe), like a Heyzine flipbook, but the
 * pages are real HTML so Google can read them.
 *
 * How it works: `children` are the pages (each an element with class "flip-page"), rendered on
 * the server into a visually hidden source block (read by Google and screen readers). After
 * hydration the pages are cloned into an element React does not manage, and page-flip turns
 * that into the animated book (page-flip moves and removes its DOM, so React must not own it).
 */
export default function FlipBook({
  children,
  titles,
  label,
  pageRatio = 1,
  theme = "dark",
}: {
  children: ReactNode;
  // One title per page, for the contents menu and the page counter
  titles: string[];
  // Accessible name of the book region
  label: string;
  // Page width / height (1 = square pages, about 1.69 for a landscape brochure)
  pageRatio?: number;
  // "light": white toolbar for a light backdrop, like Heyzine's default viewer
  theme?: "dark" | "light";
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const soundRef = useRef(true);

  const pageRef = useRef<number | null>(null); // last page shown, to reopen there after a rebuild

  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);
  // Two pages side by side on a screen wider than tall (desktop, tablet or phone turned sideways),
  // one page on an upright phone or tablet. null on the server, before the screen is known.
  const twoPages = useSyncExternalStore(subscribeResize, () => window.innerWidth > window.innerHeight, () => null);
  // iPhone Safari has no full screen for page elements: no button there
  const canFullscreen = useSyncExternalStore(subscribeNothing, () => Boolean(document.fullscreenEnabled), () => true);
  const [soundOn, setSoundOn] = useState(true);
  const [showContents, setShowContents] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const total = titles.length;
  const orientation: Orientation = twoPages === false ? "portrait" : "landscape";

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  // Build the book once the page has loaded in the browser, and again when the screen turns
  // (one page ↔ two pages), opening at the same page
  useEffect(() => {
    if (twoPages === null) return;
    let cancelled = false;
    let book: PageFlip | null = null;

    import("page-flip").then(({ PageFlip }) => {
      if (cancelled || !sourceRef.current || !mountRef.current) return;

      // Element owned by page-flip (removed again by book.destroy())
      const root = document.createElement("div");
      root.setAttribute("aria-hidden", "true"); // the hidden source copy is the accessible one
      mountRef.current.appendChild(root);

      const pages = Array.from(sourceRef.current.children).map((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
        return clone;
      });
      pages.forEach((p) => root.appendChild(p));

      // #page-5 in the address opens the book at page 5
      const match = window.location.hash.match(/^#page-(\d+)$/);
      const linked = match ? Math.min(Math.max(Number(match[1]) - 1, 0), pages.length - 1) : 0;
      const startPage = pageRef.current ?? linked;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // page-flip shows one page when the book is narrower than twice minWidth (and usePortrait is on).
      // Two pages: usePortrait off, so a small minWidth just keeps the book from overflowing.
      // One page: the mount is already sized for one page (see maxWidth below); a minWidth over half
      // of it, and under all of it, keeps page-flip on one page without overflowing.
      const bookWidth = mountRef.current.clientWidth || 1;
      const minWidth = twoPages ? Math.min(100, bookWidth) : Math.ceil(bookWidth * 0.55);

      book = new PageFlip(root, {
        startPage,
        size: "stretch",
        width: Math.round(560 * pageRatio),
        height: 560,
        minWidth,
        maxWidth: Math.round(640 * pageRatio),
        minHeight: Math.round(minWidth / pageRatio / 2),
        maxHeight: 640,
        showCover: true,
        drawShadow: true,
        // A quick, light turn with soft shadows, like a Heyzine flipbook
        maxShadowOpacity: 0.28,
        flippingTime: reduceMotion ? 250 : 700,
        usePortrait: !twoPages,
        mobileScrollSupport: true,
        showPageCorners: true,
      });

      book.on("init", (e) => {
        void loadFlipSounds();
        setPage(e.data.page);
        pageRef.current = e.data.page;
        setReady(true);
      });
      // Sound as the page starts to move (button, key, click or a released drag)
      book.on("changeState", (e) => {
        if (e.data === "flipping" && soundRef.current) void playFlipSound();
      });
      book.on("flip", (e) => {
        setPage(e.data);
        pageRef.current = e.data;
        // #page-N for pages after the cover (shareable); the cover keeps a clean address
        const hash = e.data > 0 ? `#page-${e.data + 1}` : "";
        if (window.location.hash !== hash)
          window.history.replaceState(null, "", hash || window.location.pathname + window.location.search);
      });

      book.loadFromHTML(pages);
      bookRef.current = book;
    });

    return () => {
      cancelled = true;
      book?.destroy();
      bookRef.current = null;
    };
  }, [pageRatio, twoPages]);

  // Full screen changes the space for the book: let page-flip measure again
  useEffect(() => {
    const frame = requestAnimationFrame(() => bookRef.current?.update());
    return () => cancelAnimationFrame(frame);
  }, [fullscreen]);

  // Keyboard: left / right arrows turn the pages
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") bookRef.current?.flipNext();
      if (e.key === "ArrowLeft") bookRef.current?.flipPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scrolling turns the pages: mouse wheel or trackpad, up/down or sideways. Down or right is the
  // next page. One gesture turns one page: a trackpad keeps sending scroll events while it coasts,
  // so the next page needs a new scroll after a short pause.
  useEffect(() => {
    let total = 0; // scroll distance gathered in this gesture
    let lastEvent = 0;
    let turnedInGesture = false;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.ctrlKey || target?.closest("[data-own-scroll]")) return; // pinch zoom, the contents list
      e.preventDefault(); // no page scroll, and no browser back/forward swipe

      const now = performance.now();
      if (now - lastEvent > 250) {
        // A new gesture after a pause
        total = 0;
        turnedInGesture = false;
      }
      lastEvent = now;
      if (turnedInGesture) return;

      const lineHeight = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * lineHeight;
      total += delta;
      if (Math.abs(total) < 60) return;

      if (total > 0) bookRef.current?.flipNext();
      else bookRef.current?.flipPrev();
      total = 0;
      turnedInGesture = true;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapperRef.current?.requestFullscreen?.();
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: document.title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goTo = (index: number) => {
    setShowContents(false);
    bookRef.current?.flip(index);
  };

  // "Pages 4–5" in a two-page spread, "Page 4" otherwise
  const spread = orientation === "landscape" && page > 0 && page < total - 1;
  const pageLabel = spread ? `${page + 1}–${Math.min(page + 2, total)}` : `${page + 1}`;
  const light = theme === "light";

  // Closed book in a two-page view: the front cover shows on the right half, a back cover on its
  // own (even page count) on the left half; shift the book by a quarter to centre it
  const landscape = orientation === "landscape";
  const coverOnly = landscape && page === 0;
  const backOnly = landscape && page > 0 && page === total - 1;
  const shift = coverOnly ? -25 : backOnly ? 25 : 0;

  // Paper edges along the outer sides, for the pages under the open ones
  const leftShown = landscape ? page > 0 : true;
  const rightShown = landscape ? !backOnly : true;
  const lastShown = landscape && spread ? page + 1 : page;
  const pagesLeft = leftShown ? page : 0;
  const pagesRight = rightShown ? total - 1 - lastShown : 0;

  return (
    <div
      ref={wrapperRef}
      role="region"
      aria-label={label}
      className={`flipbook-region relative w-full ${fullscreen ? `h-full flex flex-col items-center justify-center p-4 ${light ? "bg-[#d4d4d4]" : "bg-ink"}` : ""}`}
    >
      {/* Server-rendered pages: what Google and screen readers read */}
      <div ref={sourceRef} className="sr-only">
        {children}
      </div>

      {/* The animated book (filled in the browser) */}
      <div className="relative w-full" style={{ "--r": pageRatio } as CSSProperties}>
        <div
          className="relative mx-auto w-full transition-transform duration-700 ease-out"
          style={{
            // Keep the whole book on screen: two pages side by side, or one on phones
            maxWidth:
              orientation === "landscape"
                ? `min(${Math.round(1280 * pageRatio)}px, calc((100dvh - var(--book-reserve)) * ${2 * pageRatio}))`
                : `min(${Math.round(640 * pageRatio)}px, calc((100dvh - var(--book-reserve)) * ${pageRatio}))`,
            // A closed book (front cover, or a back cover on its own) sits in the middle, not on one half
            transform: `translateX(${shift}%)`,
          }}
        >
          <div
            ref={mountRef}
            className={`flipbook-mount w-full transition-opacity duration-700 ${
              ready ? "opacity-100" : `opacity-0 ${landscape ? "aspect-[calc(var(--r)*2)]" : "aspect-(--r)"}`
            }`}
          />
          {ready && (
            <>
              <PageEdges side="left" count={pagesLeft} />
              <PageEdges side="right" count={pagesRight} />
            </>
          )}
        </div>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-10 h-10 border-2 rounded-full animate-spin ${light ? "border-navy/15 border-t-navy" : "border-white/20 border-t-ocean"}`}
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Controls (a little tighter on small phones, so they stay on one line) */}
      <div
        className={`relative z-20 mt-6 short:mt-2 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center sm:gap-1 rounded-full backdrop-blur-md border px-1 sm:px-2 py-1 sm:py-1.5 ${
          light ? "bg-white/85 border-black/5 text-navy shadow-[0_8px_30px_rgba(0,0,0,0.12)]" : "bg-black/35 border-white/10 text-white"
        }`}
      >
        <ControlButton light={light} label="Previous page" onClick={() => bookRef.current?.flipPrev()} disabled={!ready || page === 0}>
          <ChevronLeft size={20} />
        </ControlButton>

        <label className="flex items-center gap-3 px-1 sm:px-2">
          <span className="sr-only">Go to page</span>
          <input
            type="range"
            min={1}
            max={total}
            value={page + 1}
            disabled={!ready}
            onChange={(e) => bookRef.current?.turnToPage(Number(e.target.value) - 1)}
            className={`hidden sm:block w-28 md:w-40 ${light ? "accent-navy" : "accent-ocean"}`}
          />
          <span className="text-xs tracking-[2px] tabular-nums whitespace-nowrap" aria-live="polite">
            {pageLabel} / {total}
          </span>
        </label>

        <ControlButton light={light} label="Next page" onClick={() => bookRef.current?.flipNext()} disabled={!ready || page >= total - 1}>
          <ChevronRight size={20} />
        </ControlButton>

        <span className={`w-px h-5 mx-0.5 sm:mx-1 ${light ? "bg-navy/15" : "bg-white/15"}`} aria-hidden="true" />

        <ControlButton light={light} label="Contents" onClick={() => setShowContents((v) => !v)} disabled={!ready} active={showContents}>
          <List size={18} />
        </ControlButton>
        <ControlButton light={light} label={soundOn ? "Turn page sound off" : "Turn page sound on"} onClick={() => setSoundOn((v) => !v)}>
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </ControlButton>
        {canFullscreen && (
          <ControlButton light={light} label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </ControlButton>
        )}
        <ControlButton light={light} label={copied ? "Link copied" : "Share this page"} onClick={share}>
          {copied ? <Check size={18} /> : <Share2 size={18} />}
        </ControlButton>

        {/* Contents menu */}
        {showContents && (
          <div
            data-own-scroll
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 max-h-80 overflow-y-auto rounded-xl backdrop-blur-md border py-2 shadow-2xl ${
              light ? "bg-white/95 border-black/5" : "bg-ink/95 border-white/10"
            }`}
          >
            <ul>
              {titles.map((title, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm ${light ? "hover:bg-navy/5" : "hover:bg-white/10"} ${
                      i === page || (spread && i === page + 1)
                        ? light
                          ? "text-navy font-medium"
                          : "text-ocean"
                        : light
                          ? "text-navy/65"
                          : "text-white/80"
                    }`}
                  >
                    <span className={`w-6 text-xs tabular-nums ${light ? "text-navy/40" : "text-white/40"}`}>{i + 1}</span>
                    <span className="truncate">{title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function subscribeNothing() {
  return () => {};
}

function ControlButton({
  label,
  onClick,
  disabled,
  active,
  light,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  light?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
        active ? (light ? "bg-navy/10" : "bg-white/15 text-ocean") : light ? "hover:bg-navy/5" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// Stack of paper edges beside the book: thicker the more pages lie on that side
function PageEdges({ side, count }: { side: "left" | "right"; count: number }) {
  if (count <= 0) return null;
  const sheets = Math.min(5, Math.max(2, Math.ceil(count / 4))); // one visible sheet per few pages
  const right = side === "right";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 transition-[width] duration-500"
      style={{
        [right ? "left" : "right"]: "100%",
        width: `${sheets * 2.5}px`,
        filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.25))",
      }}
    >
      <div
        className="h-full w-full"
        style={{
          // Each sheet a little shorter than the one before, like the edge of a printed book
          clipPath: right ? "polygon(0 0, 100% 1.5%, 100% 98.5%, 0 100%)" : "polygon(0 1.5%, 100% 0, 100% 100%, 0 98.5%)",
          background: `repeating-linear-gradient(${right ? "to right" : "to left"}, #ffffff 0 1.75px, #a9a9a9 1.75px 2.5px)`,
        }}
      />
    </div>
  );
}

// Page turn sound: real recordings of a book page turning (Kenney "RPG Audio", CC0 public domain),
// softened (public/sounds). Loaded once when the book opens; each turn picks one, mostly the
// full turn, at a slightly different pitch so it never sounds mechanical.
const FLIP_SOUNDS = ["/sounds/page-flip-1.mp3", "/sounds/page-flip-2.mp3"];
let flipBuffers: Promise<AudioBuffer[]> | null = null;
let audioContext: AudioContext | null = null;

function loadFlipSounds() {
  flipBuffers ??= (async () => {
    try {
      // Decoded off-screen: no audio output is needed (or allowed) before the first tap
      const decoder = new OfflineAudioContext(1, 1, 44100);
      return await Promise.all(
        FLIP_SOUNDS.map(async (src) => decoder.decodeAudioData(await (await fetch(src)).arrayBuffer()))
      );
    } catch {
      return []; // no sound (offline, unsupported): turning the page still works
    }
  })();
  return flipBuffers;
}

async function playFlipSound() {
  try {
    const buffers = await loadFlipSounds();
    if (!buffers.length) return;
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === "suspended") await ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = buffers.length > 1 && Math.random() > 0.75 ? buffers[1] : buffers[0];
    source.playbackRate.value = 0.94 + Math.random() * 0.1;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    source.connect(gain).connect(ctx.destination);
    source.start();
  } catch {
    // Audio is optional (blocked or unsupported): turning the page still works
  }
}
