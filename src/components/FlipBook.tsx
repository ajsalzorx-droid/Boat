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
        maxShadowOpacity: 0.45,
        flippingTime: reduceMotion ? 250 : 900,
        usePortrait: !twoPages,
        mobileScrollSupport: true,
        showPageCorners: true,
      });

      book.on("init", (e) => {
        setPage(e.data.page);
        pageRef.current = e.data.page;
        setReady(true);
      });
      // Sound as the page starts to move (button, key, click or a released drag)
      book.on("changeState", (e) => {
        if (e.data === "flipping" && soundRef.current) playFlipSound();
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
      className={`relative w-full ${fullscreen ? `h-full flex flex-col items-center justify-center p-4 ${light ? "bg-[#d4d4d4]" : "bg-ink"}` : ""}`}
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
                ? `min(${Math.round(1280 * pageRatio)}px, calc((100dvh - 200px) * ${2 * pageRatio}))`
                : `min(${Math.round(640 * pageRatio)}px, calc((100dvh - 200px) * ${pageRatio}))`,
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
        className={`relative z-20 mt-6 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center sm:gap-1 rounded-full backdrop-blur-md border px-1 sm:px-2 py-1 sm:py-1.5 ${
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

// Natural page turn, made with the Web Audio API (no sound file to download): the crackly rustle
// of paper as the page lifts, the soft rush of air as it swings over, and a light flap as it lands.
// Every turn is a little different, like real paper.
let audioContext: AudioContext | null = null;

function playFlipSound() {
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const vary = (value: number, amount = 0.15) => value * (1 + (Math.random() * 2 - 1) * amount);
    const length = vary(0.5, 0.12);

    // Rustle: paper grain with crackles that come and go, its pitch falling as the page moves away
    const rustle = noise(ctx, length, true);
    const highpass = filter(ctx, "highpass", vary(1100));
    const band = filter(ctx, "bandpass", vary(4200), 0.7);
    band.frequency.exponentialRampToValueAtTime(vary(1600), now + length);
    rustle.connect(highpass).connect(band).connect(envelope(ctx, now, vary(0.05), length, vary(0.2)));

    // Air: a low, soft whoosh that swells mid-turn
    const air = noise(ctx, length, false);
    air.connect(filter(ctx, "bandpass", vary(550), 0.6)).connect(envelope(ctx, now, length * 0.45, length, vary(0.1)));

    // Flap: the page settling on the others
    const landing = now + length * 0.8;
    const flap = noise(ctx, 0.12, true);
    flap.connect(filter(ctx, "lowpass", vary(700))).connect(envelope(ctx, landing, 0.006, 0.11, vary(0.14)));

    rustle.start(now);
    air.start(now);
    flap.start(landing);
  } catch {
    // Audio is optional (blocked or unsupported): turning the page still works
  }
}

// Noise source: crackly (white noise with short random bursts) or soft (brown noise)
function noise(ctx: AudioContext, seconds: number, crackle: boolean) {
  const data = new Float32Array(Math.floor(ctx.sampleRate * seconds));
  const burstsPerSample = 120 / ctx.sampleRate; // about 120 crackles a second
  const fade = Math.exp(-1 / (0.004 * ctx.sampleRate)); // each fades in a few milliseconds
  let burst = 0;
  let brown = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (crackle) {
      if (Math.random() < burstsPerSample) burst = 0.6 + Math.random() * 1.4;
      burst *= fade;
      data[i] = white * (0.35 + burst);
    } else {
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = brown * 3.5;
    }
  }
  const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
  buffer.copyToChannel(data, 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

function filter(ctx: AudioContext, type: BiquadFilterType, frequency: number, q?: number) {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (q !== undefined) node.Q.value = q;
  return node;
}

// Gain that rises to peak over attack, then fades out by the end of length; plays to the speakers
function envelope(ctx: AudioContext, start: number, attack: number, length: number, peak: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  gain.connect(ctx.destination);
  return gain;
}
