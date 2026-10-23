"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { Orientation, PageFlip } from "page-flip";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  List,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Share2,
  Check,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  SlidersHorizontal,
  MoreHorizontal,
  X,
} from "lucide-react";

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
  pdfUrl,
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
  // PDF for the Download button; without one, Download opens the print dialog ("Save as PDF")
  pdfUrl?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const soundRef = useRef(true);
  const jumpRef = useRef(false); // the next turn skips pages (contents list): longer sound

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
  // Zoom: the book is magnified and follows the pointer (like Heyzine's zoom); turning is paused
  const [zoomed, setZoomed] = useState(false);
  const [zoomClip, setZoomClip] = useState(false); // clip the magnified book until it has shrunk back
  const zoomedRef = useRef(false);
  const zoomLayerRef = useRef<HTMLDivElement>(null);
  // Search text: the words of every page, read from the hidden source copy when the panel opens
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  // Controls panel: which toolbar buttons show, toolbar style and navigation (saved in this browser)
  const controls = useSyncExternalStore(subscribeControls, getControls, () => DEFAULT_CONTROLS);
  const controlsRef = useRef(controls);
  const [showControls, setShowControls] = useState(false);
  const [showMore, setShowMore] = useState(false); // phones: menu with the buttons that do not fit
  const [controlsTab, setControlsTab] = useState<"show" | "style" | "navigation">("show");

  const total = titles.length;
  const orientation: Orientation = twoPages === false ? "portrait" : "landscape";

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    zoomedRef.current = zoomed;
  }, [zoomed]);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

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
        // Like Heyzine's magazine viewer (turn.js, gradients on): a clear shadow across the
        // curling page, at a brisker speed (FLIP_MS)
        maxShadowOpacity: 0.5,
        flippingTime: reduceMotion ? 250 : FLIP_MS,
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
      // Sound as the page starts to move (button, key, click or a released drag), and a quiet
      // rustle when the mouse lifts a page corner
      book.on("changeState", (e) => {
        if (!soundRef.current) return;
        if (e.data === "flipping") {
          void playFlipSound(jumpRef.current ? "lg" : "md");
          jumpRef.current = false;
        } else if (e.data === "fold_corner") {
          void playFlipSound("sm");
        }
      });
      book.on("flip", (e) => {
        setZoomed(false); // a new page opens at normal size
        setPage(e.data);
        pageRef.current = e.data;
        // #page-N for pages after the cover (shareable); the cover keeps a clean address
        if (!controlsRef.current.pageLink) return;
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

  // Keyboard: left / right arrows turn the pages, Escape leaves the zoom
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape") {
        setZoomed(false);
        setShowControls(false);
      }
      if (!controlsRef.current.keys) return;
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
      if (!controlsRef.current.wheel) return; // turned off in the Controls panel: the page scrolls
      e.preventDefault(); // no page scroll, and no browser back/forward swipe
      if (zoomedRef.current) return; // zoomed in: the pointer pans, the wheel does not turn pages

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

  const toggleZoom = () => {
    if (!zoomed) {
      if (zoomLayerRef.current) zoomLayerRef.current.style.transformOrigin = "50% 50%";
      setZoomClip(true);
    }
    setZoomed(!zoomed);
  };

  // Zoomed in: the magnified book follows the pointer (mouse or finger), so every corner can be read
  const panZoom = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    if (zoomLayerRef.current) zoomLayerRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  const openSearch = () => {
    setShowContents(false);
    setShowMore(false);
    if (!showSearch && sourceRef.current)
      setPageTexts(Array.from(sourceRef.current.children).map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim()));
    setShowSearch(!showSearch);
  };

  // Pages containing the search words, with a short piece of text around the first match
  const needle = query.trim().toLowerCase();
  const results =
    needle.length < 2
      ? []
      : pageTexts.flatMap((text, i) => {
          const at = text.toLowerCase().indexOf(needle);
          if (at < 0) return [];
          const start = Math.max(0, at - 40);
          return [
            {
              page: i,
              before: (start > 0 ? "…" : "") + text.slice(start, at),
              match: text.slice(at, at + needle.length),
              after: text.slice(at + needle.length, at + needle.length + 60) + "…",
            },
          ];
        });

  // Print every page, one per sheet, from a hidden frame holding copies of the pages and the
  // site's stylesheets (the pages are sized in cqw, so they scale to the paper)
  const printBook = () => {
    if (!sourceRef.current) return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return frame.remove();

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join("");
    doc.documentElement.innerHTML = `<head><title>${document.title}</title>${styles}<style>
      @page { size: ${pageRatio >= 1 ? "landscape" : "portrait"}; margin: 0; }
      html, body { margin: 0; background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .flip-page { position: relative; width: min(100vw, calc(100vh * ${pageRatio})); aspect-ratio: ${pageRatio}; margin: 0 auto; break-after: page; }
    </style></head><body></body>`;
    Array.from(sourceRef.current.children).forEach((node) => {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("img").forEach((img) => img.setAttribute("loading", "eager"));
      doc.body.appendChild(doc.importNode(clone, true));
    });

    // Print once the pictures and stylesheets have loaded, then remove the frame
    const waits = Array.from(doc.querySelectorAll("img, link[rel=stylesheet]"))
      .filter((el) => !(el.tagName === "IMG" && (el as HTMLImageElement).complete))
      .map((el) => new Promise((done) => (el.addEventListener("load", done), el.addEventListener("error", done))));
    void Promise.all(waits).then(() => {
      win.addEventListener("afterprint", () => frame.remove());
      win.focus();
      win.print();
      setTimeout(() => frame.remove(), 60_000); // browsers without afterprint
    });
  };

  const download = () => {
    if (!pdfUrl) return printBook();
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "";
    link.click();
  };

  const goTo = (index: number) => {
    setShowContents(false);
    setShowSearch(false);
    // More than one spread away: the turn gets the longer "riffle" sound
    jumpRef.current = Math.abs(index - (pageRef.current ?? 0)) > (orientation === "landscape" ? 2 : 1);
    bookRef.current?.flip(index);
  };

  // "Pages 4–5" in a two-page spread, "Page 4" otherwise
  const spread = orientation === "landscape" && page > 0 && page < total - 1;
  const pageLabel = spread ? `${page + 1}–${Math.min(page + 2, total)}` : `${page + 1}`;
  const light = controls.theme === "auto" ? theme === "light" : controls.theme === "light";
  const square = controls.shape === "square";
  const setControl = <K extends keyof Controls>(key: K, value: Controls[K]) => saveControls({ ...controls, [key]: value });

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
      <div className={`relative w-full ${zoomClip ? "overflow-hidden" : ""}`} style={{ "--r": pageRatio } as CSSProperties}>
        <div
          ref={zoomLayerRef}
          className="transition-transform duration-300 ease-out"
          style={{ transform: zoomed ? `scale(${ZOOM})` : "none" }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && !zoomed) setZoomClip(false);
          }}
        >
          <div
            className="relative mx-auto w-full transition-transform ease-out"
            style={{
              // The book slides to the middle (closed) or back (opened) together with the page turn
              transitionDuration: `${FLIP_MS}ms`,
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
            {ready && controls.edges && (
              <>
                <PageEdges side="left" count={pagesLeft} />
                <PageEdges side="right" count={pagesRight} />
              </>
            )}
          </div>
        </div>
        {/* Zoomed in: this layer takes the pointer (pan, or click / tap to zoom out), so the
            magnified pages cannot be turned by accident */}
        {zoomed && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 cursor-zoom-out touch-none"
            onPointerMove={panZoom}
            onPointerDown={panZoom}
            onClick={() => setZoomed(false)}
          />
        )}
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
        className={`relative z-20 mt-6 short:mt-2 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center sm:gap-1 backdrop-blur-md border px-1 sm:px-2 py-1 sm:py-1.5 ${
          square ? "rounded-lg" : "rounded-full"
        } ${light ? "bg-white/85 border-black/5 text-navy shadow-[0_8px_30px_rgba(0,0,0,0.12)]" : "bg-black/35 border-white/10 text-white"}`}
      >
        {controls.first && (
          <ControlButton desktopOnly light={light} square={square} label="First page" onClick={() => goTo(0)} disabled={!ready || page === 0}>
            <ChevronsLeft size={20} />
          </ControlButton>
        )}
        {controls.prevNext && (
          <ControlButton light={light} square={square} label="Previous page" onClick={() => bookRef.current?.flipPrev()} disabled={!ready || page === 0}>
            <ChevronLeft size={20} />
          </ControlButton>
        )}

        <label className="flex items-center gap-3 px-1 sm:px-2">
          <span className="sr-only">Go to page</span>
          {controls.slider && (
            <input
              type="range"
              min={1}
              max={total}
              value={page + 1}
              disabled={!ready}
              onChange={(e) => bookRef.current?.turnToPage(Number(e.target.value) - 1)}
              className={`hidden sm:block w-28 md:w-40 ${light ? "accent-navy" : "accent-ocean"}`}
            />
          )}
          <span className="text-xs tracking-[2px] tabular-nums whitespace-nowrap" aria-live="polite">
            {pageLabel} / {total}
          </span>
        </label>

        {controls.prevNext && (
          <ControlButton
            light={light}
            square={square}
            label="Next page"
            onClick={() => bookRef.current?.flipNext()}
            disabled={!ready || page >= total - 1}
          >
            <ChevronRight size={20} />
          </ControlButton>
        )}
        {controls.last && (
          <ControlButton desktopOnly light={light} square={square} label="Last page" onClick={() => goTo(total - 1)} disabled={!ready || page >= total - 1}>
            <ChevronsRight size={20} />
          </ControlButton>
        )}

        <span className={`w-px h-5 mx-0.5 sm:mx-1 ${light ? "bg-navy/15" : "bg-white/15"}`} aria-hidden="true" />

        {controls.contents && (
          <ControlButton
            light={light}
            square={square}
            label="Contents"
            onClick={() => {
              setShowSearch(false);
              setShowMore(false);
              setShowContents((v) => !v);
            }}
            disabled={!ready}
            active={showContents}
          >
            <List size={18} />
          </ControlButton>
        )}
        {controls.search && (
          <ControlButton light={light} square={square} label="Search text" onClick={openSearch} disabled={!ready} active={showSearch}>
            <Search size={18} />
          </ControlButton>
        )}
        {controls.zoom && (
          <ControlButton light={light} square={square} label={zoomed ? "Zoom out" : "Zoom in"} onClick={toggleZoom} disabled={!ready} active={zoomed}>
            {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </ControlButton>
        )}
        {controls.sound && (
          <ControlButton desktopOnly
            light={light}
            square={square}
            label={soundOn ? "Turn page sound off" : "Turn page sound on"}
            onClick={() => setSoundOn((v) => !v)}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </ControlButton>
        )}
        {canFullscreen && controls.fullscreen && (
          <ControlButton desktopOnly light={light} square={square} label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </ControlButton>
        )}
        {controls.share && (
          <ControlButton desktopOnly light={light} square={square} label={copied ? "Link copied" : "Share this page"} onClick={share}>
            {copied ? <Check size={18} /> : <Share2 size={18} />}
          </ControlButton>
        )}
        {controls.download && (
          <ControlButton desktopOnly light={light} square={square} label="Download" onClick={download} disabled={!ready}>
            <Download size={18} />
          </ControlButton>
        )}
        {controls.print && (
          <ControlButton desktopOnly light={light} square={square} label="Print" onClick={printBook} disabled={!ready}>
            <Printer size={18} />
          </ControlButton>
        )}
        <ControlButton desktopOnly light={light} square={square} label="Controls" onClick={() => setShowControls((v) => !v)} active={showControls}>
          <SlidersHorizontal size={18} />
        </ControlButton>

        {/* Phones: the buttons above that do not fit on one line, in a menu */}
        <ControlButton
          mobileOnly
          light={light}
          square={square}
          label="More"
          onClick={() => {
            setShowContents(false);
            setShowSearch(false);
            setShowMore((v) => !v);
          }}
          active={showMore}
        >
          <MoreHorizontal size={20} />
        </ControlButton>

        {showMore && (
          <div
            className={`sm:hidden absolute bottom-full right-0 mb-3 w-56 max-w-[calc(100vw-2rem)] rounded-xl backdrop-blur-md border py-2 shadow-2xl ${
              light ? "bg-white/95 border-black/5 text-navy" : "bg-ink/95 border-white/10 text-white"
            }`}
          >
            <ul>
              {controls.first && (
                <MenuItem light={light} onPick={() => setShowMore(false)} label="First page" onClick={() => goTo(0)} disabled={!ready || page === 0}>
                  <ChevronsLeft size={18} />
                </MenuItem>
              )}
              {controls.last && (
                <MenuItem light={light} onPick={() => setShowMore(false)} label="Last page" onClick={() => goTo(total - 1)} disabled={!ready || page >= total - 1}>
                  <ChevronsRight size={18} />
                </MenuItem>
              )}
              {controls.sound && (
                <MenuItem light={light} onPick={() => setShowMore(false)} label={soundOn ? "Sound off" : "Sound on"} onClick={() => setSoundOn((v) => !v)}>
                  {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </MenuItem>
              )}
              {canFullscreen && controls.fullscreen && (
                <MenuItem light={light} onPick={() => setShowMore(false)} label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </MenuItem>
              )}
              {controls.share && (
                <MenuItem light={light} onPick={() => setShowMore(false)} label={copied ? "Link copied" : "Share"} onClick={share}>
                  {copied ? <Check size={18} /> : <Share2 size={18} />}
                </MenuItem>
              )}
              {controls.download && (
                <MenuItem light={light} onPick={() => setShowMore(false)} label="Download" onClick={download} disabled={!ready}>
                  <Download size={18} />
                </MenuItem>
              )}
              {controls.print && (
                <MenuItem light={light} onPick={() => setShowMore(false)} label="Print" onClick={printBook} disabled={!ready}>
                  <Printer size={18} />
                </MenuItem>
              )}
              <MenuItem light={light} onPick={() => setShowMore(false)} label="Controls" onClick={() => setShowControls(true)}>
                <SlidersHorizontal size={18} />
              </MenuItem>
            </ul>
          </div>
        )}

        {/* Contents menu */}
        {showContents && (
          <div
            data-own-scroll
            data-lenis-prevent
            className={`contents-scroll absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 max-h-80 overflow-y-auto overscroll-contain rounded-xl backdrop-blur-md border py-2 shadow-2xl ${
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

        {/* Search text panel */}
        {showSearch && (
          <div
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl backdrop-blur-md border shadow-2xl ${
              light ? "bg-white/95 border-black/5 text-navy" : "bg-ink/95 border-white/10 text-white"
            }`}
          >
            <div className={`flex items-center gap-2 px-4 py-3 border-b ${light ? "border-navy/10" : "border-white/10"}`}>
              <Search size={16} className="shrink-0 opacity-50" aria-hidden="true" />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowSearch(false);
                  if (e.key === "Enter" && results.length) goTo(results[0].page);
                }}
                placeholder="Search in the book"
                aria-label="Search in the book"
                className="w-full bg-transparent text-sm outline-none placeholder:opacity-50"
              />
            </div>
            {needle.length >= 2 && (
              <div data-own-scroll data-lenis-prevent className="contents-scroll max-h-72 overflow-y-auto overscroll-contain py-2">
                <p className="px-4 pb-1 text-[11px] tracking-[1px] uppercase opacity-50" aria-live="polite">
                  {results.length === 0 ? "No results" : `${results.length} ${results.length === 1 ? "page" : "pages"}`}
                </p>
                <ul>
                  {results.map((r) => (
                    <li key={r.page}>
                      <button
                        type="button"
                        onClick={() => goTo(r.page)}
                        className={`w-full flex gap-3 px-4 py-2 text-left text-sm ${light ? "hover:bg-navy/5" : "hover:bg-white/10"}`}
                      >
                        <span className={`w-6 shrink-0 text-xs tabular-nums pt-0.5 ${light ? "text-navy/40" : "text-white/40"}`}>{r.page + 1}</span>
                        <span className={`line-clamp-2 ${light ? "text-navy/70" : "text-white/75"}`}>
                          {r.before}
                          <mark className={`rounded-sm px-0.5 ${light ? "bg-ocean/30 text-navy" : "bg-ocean/40 text-white"}`}>{r.match}</mark>
                          {r.after}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls panel: show / hide toolbar buttons, toolbar style, navigation */}
      {showControls && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4" onClick={() => setShowControls(false)}>
          <div
            role="dialog"
            aria-label="Controls"
            data-own-scroll
            data-lenis-prevent
            onClick={(e) => e.stopPropagation()}
            className="w-[30rem] max-w-full max-h-full overflow-y-auto overscroll-contain rounded-xl bg-[#f6f6f4] text-neutral-700 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-base font-medium text-neutral-800">Controls</h2>
              <button
                type="button"
                onClick={() => setShowControls(false)}
                aria-label="Close controls"
                className="p-1 rounded text-rose-400 hover:bg-rose-50"
              >
                <X size={16} />
              </button>
            </div>

            <div role="tablist" className="flex gap-1 px-2">
              {CONTROL_TABS.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={controlsTab === id}
                  onClick={() => setControlsTab(id)}
                  className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
                    controlsTab === id ? "bg-white text-neutral-900" : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div role="tabpanel" className="bg-white px-5 py-5">
              {controlsTab === "show" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
                  {SHOW_HIDE.map(([key, name]) => (
                    <Switch key={key} label={name} checked={controls[key]} onChange={(v) => setControl(key, v)} />
                  ))}
                </div>
              )}

              {controlsTab === "style" && (
                <div className="flex flex-col gap-5">
                  <Choice
                    label="Toolbar colour"
                    value={controls.theme}
                    options={[
                      ["auto", "Auto"],
                      ["light", "Light"],
                      ["dark", "Dark"],
                    ]}
                    onChange={(v) => setControl("theme", v)}
                  />
                  <Choice
                    label="Toolbar shape"
                    value={controls.shape}
                    options={[
                      ["pill", "Rounded"],
                      ["square", "Square"],
                    ]}
                    onChange={(v) => setControl("shape", v)}
                  />
                  <Switch label="Page edges beside the book" checked={controls.edges} onChange={(v) => setControl("edges", v)} />
                </div>
              )}

              {controlsTab === "navigation" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <Switch label="Turn with mouse wheel" checked={controls.wheel} onChange={(v) => setControl("wheel", v)} />
                  <Switch label="Turn with arrow keys" checked={controls.keys} onChange={(v) => setControl("keys", v)} />
                  <Switch label="Page number in address" checked={controls.pageLink} onChange={(v) => setControl("pageLink", v)} />
                  <Switch label="Page turn sound" checked={soundOn} onChange={setSoundOn} />
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => saveControls(DEFAULT_CONTROLS)}
                className="px-5 py-1.5 text-sm rounded border border-neutral-300 text-neutral-600 hover:bg-white"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowControls(false)}
                className="px-10 py-1.5 text-sm rounded border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Controls panel settings, saved in this browser (localStorage)
type Controls = {
  download: boolean;
  share: boolean;
  print: boolean;
  fullscreen: boolean;
  prevNext: boolean;
  zoom: boolean;
  first: boolean;
  last: boolean;
  search: boolean;
  contents: boolean;
  sound: boolean;
  slider: boolean;
  theme: "auto" | "light" | "dark";
  shape: "pill" | "square";
  edges: boolean;
  wheel: boolean;
  keys: boolean;
  pageLink: boolean;
};

// The toolbar as it was before the Controls panel
const DEFAULT_CONTROLS: Controls = {
  download: false,
  share: true,
  print: false,
  fullscreen: true,
  prevNext: true,
  zoom: true,
  first: false,
  last: false,
  search: true,
  contents: true,
  sound: true,
  slider: true,
  theme: "auto",
  shape: "pill",
  edges: true,
  wheel: true,
  keys: true,
  pageLink: true,
};

const CONTROL_TABS = [
  ["show", "Show / Hide"],
  ["style", "Style"],
  ["navigation", "Navigation"],
] as const;

type BooleanControl = { [K in keyof Controls]: Controls[K] extends boolean ? K : never }[keyof Controls];

const SHOW_HIDE: [BooleanControl, string][] = [
  ["download", "Download"],
  ["share", "Share"],
  ["print", "Print"],
  ["fullscreen", "Full screen"],
  ["prevNext", "Prev / next page"],
  ["zoom", "Zoom button"],
  ["first", "First page"],
  ["last", "Last page"],
  ["search", "Search text"],
  ["contents", "Contents"],
  ["sound", "Sound button"],
  ["slider", "Page slider"],
];

const CONTROLS_KEY = "flipbook-controls";
const controlsListeners = new Set<() => void>();
let currentControls: Controls | null = null;

function getControls() {
  if (!currentControls) {
    currentControls = DEFAULT_CONTROLS;
    try {
      const saved = localStorage.getItem(CONTROLS_KEY);
      if (saved) currentControls = { ...DEFAULT_CONTROLS, ...JSON.parse(saved) };
    } catch {
      // Storage blocked or bad data: the defaults
    }
  }
  return currentControls!;
}

function saveControls(next: Controls) {
  currentControls = next;
  try {
    localStorage.setItem(CONTROLS_KEY, JSON.stringify(next));
  } catch {
    // Not saved (private window): still applies until the page reloads
  }
  controlsListeners.forEach((listener) => listener());
}

function subscribeControls(onChange: () => void) {
  controlsListeners.add(onChange);
  return () => controlsListeners.delete(onChange);
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-[30px] h-4 rounded-full border transition-colors ${
          checked ? "bg-emerald-600 border-emerald-600" : "bg-white border-neutral-300"
        }`}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow transition-all ${
            checked ? "left-[13px] bg-white" : "left-px bg-white border border-neutral-300"
          }`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <div className="flex rounded-lg bg-neutral-100 p-0.5">
        {options.map(([id, name]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={`px-3 py-1 rounded-md transition-colors ${value === id ? "bg-white text-emerald-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
          >
            {name}
          </button>
        ))}
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
  square,
  desktopOnly,
  mobileOnly,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  light?: boolean;
  square?: boolean;
  // Shown from the sm breakpoint up (on phones it is in the More menu), or only below it
  desktopOnly?: boolean;
  mobileOnly?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-9 h-9 sm:w-10 sm:h-10 ${desktopOnly ? "hidden sm:flex" : mobileOnly ? "flex sm:hidden" : "flex"} items-center justify-center ${square ? "rounded-md" : "rounded-full"} transition-colors disabled:opacity-30 ${
        active ? (light ? "bg-navy/10" : "bg-white/15 text-ocean") : light ? "hover:bg-navy/5" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// One line of the More menu (phones): icon and name; picking it closes the menu
function MenuItem({
  label,
  onClick,
  onPick,
  disabled,
  light,
  children,
}: {
  label: string;
  onClick: () => void;
  onPick: () => void;
  disabled?: boolean;
  light?: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          onPick();
          onClick();
        }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm disabled:opacity-30 ${light ? "hover:bg-navy/5" : "hover:bg-white/10"}`}
      >
        <span className="opacity-70">{children}</span>
        {label}
      </button>
    </li>
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

// How long one page turn takes (Heyzine: 1000 ms; quicker here)
const FLIP_MS = 400;

// How much the Zoom button magnifies the book
const ZOOM = 2;

// Page turn sounds (Heyzine's, in public/sounds), played the way Heyzine plays them:
// sm = page corner lifted, md = one page turned, lg = several pages skipped. Short and quiet, and
// a new sound stops the one still playing so fast turns never pile up. Loaded once when the book
// opens, so the first turn plays without a delay.
type FlipSound = "sm" | "md" | "lg";
const FLIP_VOLUME: Record<FlipSound, number> = { sm: 0.1, md: 0.2, lg: 0.2 };
let flipBuffers: Promise<Partial<Record<FlipSound, AudioBuffer>>> | null = null;
let audioContext: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;

function loadFlipSounds() {
  flipBuffers ??= (async () => {
    // Decoded off-screen: no audio output is needed (or allowed) before the first tap
    const decoder = new OfflineAudioContext(1, 1, 44100);
    const entries = await Promise.all(
      (Object.keys(FLIP_VOLUME) as FlipSound[]).map(async (size) => {
        try {
          const data = await (await fetch(`/sounds/page-turn-${size}.mp3`)).arrayBuffer();
          return [size, await decoder.decodeAudioData(data)] as const;
        } catch {
          return [size, undefined] as const; // no sound (offline, unsupported): turning still works
        }
      })
    );
    return Object.fromEntries(entries);
  })();
  return flipBuffers;
}

async function playFlipSound(size: FlipSound) {
  try {
    const buffer = (await loadFlipSounds())[size];
    if (!buffer) return;
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === "suspended") await ctx.resume();

    playing?.stop();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = FLIP_VOLUME[size];
    source.connect(gain).connect(ctx.destination);
    source.start();
    playing = source;
  } catch {
    // Audio is optional (blocked or unsupported): turning the page still works
  }
}
