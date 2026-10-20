"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
}: {
  children: ReactNode;
  // One title per page, for the contents menu and the page counter
  titles: string[];
  // Accessible name of the book region
  label: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const soundRef = useRef(true);

  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [soundOn, setSoundOn] = useState(true);
  const [showContents, setShowContents] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const total = titles.length;

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  // Build the book once the page has loaded in the browser
  useEffect(() => {
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
      const startPage = match ? Math.min(Math.max(Number(match[1]) - 1, 0), pages.length - 1) : 0;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      book = new PageFlip(root, {
        startPage,
        size: "stretch",
        width: 560,
        height: 560,
        minWidth: 240,
        maxWidth: 640,
        minHeight: 240,
        maxHeight: 640,
        showCover: true,
        drawShadow: true,
        maxShadowOpacity: 0.45,
        flippingTime: reduceMotion ? 250 : 900,
        usePortrait: true,
        mobileScrollSupport: true,
        showPageCorners: true,
      });

      book.on("init", (e) => {
        setPage(e.data.page);
        setOrientation(e.data.mode);
        setReady(true);
      });
      book.on("flip", (e) => {
        setPage(e.data);
        if (soundRef.current) playFlipSound();
        window.history.replaceState(null, "", `#page-${e.data + 1}`);
      });
      book.on("changeOrientation", (e) => setOrientation(e.data));

      book.loadFromHTML(pages);
      bookRef.current = book;
    });

    return () => {
      cancelled = true;
      book?.destroy();
      bookRef.current = null;
    };
  }, []);

  // One page ↔ two pages changes the mount's max width: let page-flip measure again
  useEffect(() => {
    const frame = requestAnimationFrame(() => bookRef.current?.update());
    return () => cancelAnimationFrame(frame);
  }, [orientation, fullscreen]);

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

  return (
    <div
      ref={wrapperRef}
      role="region"
      aria-label={label}
      className={`relative w-full ${fullscreen ? "h-full flex flex-col items-center justify-center bg-ink p-4" : ""}`}
    >
      {/* Server-rendered pages: what Google and screen readers read */}
      <div ref={sourceRef} className="sr-only">
        {children}
      </div>

      {/* The animated book (filled in the browser) */}
      <div
        ref={mountRef}
        className={`flipbook-mount mx-auto w-full transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
        style={{
          // Keep the whole book on screen: two square pages side by side, or one on phones
          maxWidth: orientation === "landscape" ? "min(1280px, calc((100dvh - 190px) * 2))" : "min(640px, calc(100dvh - 190px))",
        }}
      />
      {!ready && (
        <div className="absolute inset-x-0 top-0 mx-auto aspect-square md:aspect-[2/1] max-w-[1280px] w-full flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-ocean rounded-full animate-spin" aria-hidden="true" />
        </div>
      )}

      {/* Controls */}
      <div className="relative z-20 mt-6 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-full bg-black/35 backdrop-blur-md border border-white/10 px-2 py-1.5 text-white">
        <ControlButton label="Previous page" onClick={() => bookRef.current?.flipPrev()} disabled={!ready || page === 0}>
          <ChevronLeft size={20} />
        </ControlButton>

        <label className="flex items-center gap-3 px-2">
          <span className="sr-only">Go to page</span>
          <input
            type="range"
            min={1}
            max={total}
            value={page + 1}
            disabled={!ready}
            onChange={(e) => bookRef.current?.turnToPage(Number(e.target.value) - 1)}
            className="hidden sm:block w-28 md:w-40 accent-ocean"
          />
          <span className="text-xs tracking-[2px] tabular-nums whitespace-nowrap" aria-live="polite">
            {pageLabel} / {total}
          </span>
        </label>

        <ControlButton label="Next page" onClick={() => bookRef.current?.flipNext()} disabled={!ready || page >= total - 1}>
          <ChevronRight size={20} />
        </ControlButton>

        <span className="w-px h-5 bg-white/15 mx-1" aria-hidden="true" />

        <ControlButton label="Contents" onClick={() => setShowContents((v) => !v)} disabled={!ready} active={showContents}>
          <List size={18} />
        </ControlButton>
        <ControlButton label={soundOn ? "Turn page sound off" : "Turn page sound on"} onClick={() => setSoundOn((v) => !v)}>
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </ControlButton>
        <ControlButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </ControlButton>
        <ControlButton label={copied ? "Link copied" : "Share this page"} onClick={share}>
          {copied ? <Check size={18} /> : <Share2 size={18} />}
        </ControlButton>

        {/* Contents menu */}
        {showContents && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 max-h-80 overflow-y-auto rounded-xl bg-ink/95 backdrop-blur-md border border-white/10 py-2 shadow-2xl">
            <ul>
              {titles.map((title, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-white/10 ${
                      i === page || (spread && i === page + 1) ? "text-ocean" : "text-white/80"
                    }`}
                  >
                    <span className="w-6 text-xs text-white/40 tabular-nums">{i + 1}</span>
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

function ControlButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
        active ? "bg-white/15 text-ocean" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// Short paper "swish", made with the Web Audio API (no sound file to download)
let audioContext: AudioContext | null = null;

function playFlipSound() {
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    const duration = 0.45;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(2400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + duration);
  } catch {
    // Audio is optional (blocked or unsupported): turning the page still works
  }
}
