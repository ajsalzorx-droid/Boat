"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import type { PageFlip } from "page-flip";
import { ArrowLeft, Download, Expand } from "lucide-react";
import { BrochureBackdrop } from "@/components/Brochure";
import { PagesPanel, SearchPanel, SharePanel } from "@/components/MenuBookPanels";
import { MENU_BOOK_PAGES } from "@/data/menu-book";
import { loadFlipSounds, playFlipSound } from "@/lib/flip-sound";
import { MENU_BOOK_PAGE_COUNT, MENU_BOOK_PDF_NAME, MENU_BOOK_PDF_URL, MENU_BOOK_RATIO, menuBookImage, menuBookViews } from "@/lib/menu-book";
import { wheelTurner } from "@/lib/wheel-turn";
import { whatsapp } from "@/lib/whatsapp";

/**
 * The menu book viewer: the site's own version of the Heyzine magazine viewer it replaced, with
 * the same layout (book filling the screen, toolbar over its lower edge, page slider under it,
 * corner arrows), page turn (1 second, quick start and soft landing) and sounds.
 *
 * The pages are rendered into a hidden block (read by Google and screen readers), then cloned into
 * an element React does not manage: page-flip moves and removes its DOM, so React must not own it.
 */

const TURN_MS = 1000; // one page turn
const SLIDE_MS = 500; // the closed book sliding to / from the middle
const ZOOM = 2;
const TOTAL = MENU_BOOK_PAGE_COUNT;

// The WhatsApp links over the QR codes of the two covers, in % of the page
const QR_LINKS: Record<number, CSSProperties> = {
  0: { left: "39.5%", top: "68.8%", width: "23.6%", height: "10.7%" },
  [TOTAL - 1]: { left: "34.4%", top: "61.3%", width: "30.7%", height: "14.1%" },
};

// Quick start, soft landing: the curve of the turn over its duration (0–1 -> 0–1)
const ease = (t: number) => {
  const s = Math.sqrt(1 - (1 - t) ** 2);
  return s * s * (3 - 2 * s);
};

type Panel = "pages" | "share" | "search";
type Size = { twoPages: boolean; w: number; h: number; stageW: number };

export default function MenuBook() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const pageRef = useRef<number | null>(null); // page shown, to reopen there when the book is rebuilt
  const targetRef = useRef<number | null>(null); // page a jump is turning to
  const soundRef = useRef(true);

  const [size, setSize] = useState<Size | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0); // page open, or being turned to
  const [settled, setSettled] = useState(0); // page open once the turn has ended
  const [sliding, setSliding] = useState<number | null>(null); // slider position while it is dragged
  const [soundOn, setSoundOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);

  const twoPages = size?.twoPages ?? true;
  const views = menuBookViews(twoPages);
  const view = Math.max(0, views.findIndex((v) => v.includes(page)));

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  // The largest book that fits: the toolbar overlaps its lower edge, the slider stays clear of it
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let timer = 0;
    const measure = () => {
      const { clientWidth: W, clientHeight: H } = stage;
      if (!W || !H) return;
      const two = W > H;
      const height = Math.min(H - (W < 640 ? 44 : 64), (two ? (W - 104) / 2 : W - 27) / MENU_BOOK_RATIO);
      const next = { twoPages: two, w: Math.floor(height * MENU_BOOK_RATIO), h: Math.floor(height), stageW: W };
      setSize((old) => (old && old.twoPages === two && old.w === next.w && old.h === next.h && old.stageW === W ? old : next));
    };
    measure();
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(measure, 120);
    });
    observer.observe(stage);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // Build the book once the page has loaded in the browser, and again (at the same page) when its size changes
  const pageW = size?.w;
  const pageH = size?.h;
  useEffect(() => {
    if (!pageW || !pageH) return;
    let cancelled = false;
    let book: PageFlip | null = null;

    import("page-flip").then(({ PageFlip }) => {
      if (cancelled || !sourceRef.current || !mountRef.current) return;
      const root = document.createElement("div"); // owned by page-flip, removed by book.destroy()
      root.setAttribute("aria-hidden", "true"); // the hidden source copy is the accessible one
      mountRef.current.appendChild(root);
      const pages = Array.from(sourceRef.current.children).map((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("a").forEach((el) => el.setAttribute("tabindex", "-1"));
        root.appendChild(clone);
        return clone;
      });

      // #page/4 in the address opens the book at page 4
      const match = window.location.hash.match(/^#page\/(\d+)$/);
      const startPage = pageRef.current ?? (match ? Math.min(Math.max(Number(match[1]) - 1, 0), TOTAL - 1) : 0);
      const turnMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : TURN_MS;

      const instance = new PageFlip(root, {
        startPage,
        size: "fixed",
        width: pageW,
        height: pageH,
        showCover: true,
        drawShadow: true,
        maxShadowOpacity: 0.5,
        flippingTime: turnMs,
        usePortrait: !twoPages,
        mobileScrollSupport: false,
        showPageCorners: true,
        disableFlipByClick: true, // a click turns the page only at its corners
      });
      book = instance;

      instance.on("init", (e) => {
        void loadFlipSounds();
        // page-flip makes both covers stiff boards: here they curl like every other page
        [0, TOTAL - 1].forEach((i) => instance.getPage(i).setDensity("soft"));

        // page-flip turns small pages faster and at a steady speed: always the same time and curve here
        const render = instance.getRender();
        const start = render.startAnimation.bind(render);
        render.startAnimation = (frames, duration, onEnd) => {
          const turn = frames.length > 60; // not the little lift of a page corner
          const eased = turn ? frames.map((_, i) => frames[Math.round(ease((i + 1) / frames.length) * (frames.length - 1))]) : frames;
          start(eased, turn ? turnMs : Math.max(duration, 200), onEnd);
        };

        // As a turn starts (button, key, corner or a released drag): its sound, and the page it leads
        // to, so the slider and the closed book move together with it
        const flip = instance.getFlipController();
        const animate = flip.animateFlippingTo.bind(flip);
        flip.animateFlippingTo = (from, to, isTurned, needReset) => {
          if (isTurned) {
            const back = flip.getCalculation()?.getDirection() === 1;
            const list = menuBookViews(twoPages);
            const now = list.findIndex((v) => v.includes(pageRef.current ?? 0));
            const beside = list[Math.min(Math.max(now + (back ? -1 : 1), 0), list.length - 1)][0];
            const target = targetRef.current ?? beside;
            targetRef.current = null;
            if (soundRef.current) void playFlipSound(target !== beside ? "lg" : "md");
            setPage(target);
          }
          animate(from, to, isTurned, needReset);
        };

        setPage(e.data.page);
        setSettled(e.data.page);
        pageRef.current = e.data.page;
        setReady(true);
      });
      instance.on("changeState", (e) => {
        if (e.data === "fold_corner" && soundRef.current) void playFlipSound("sm");
      });
      instance.on("flip", (e) => {
        setZoomed(false); // a new page opens at normal size
        setPage(e.data);
        setSettled(e.data);
        pageRef.current = e.data;
        // #page/N after the cover, to share; the cover keeps a clean address
        const hash = e.data > 0 ? `#page/${e.data + 1}` : "";
        if (window.location.hash !== hash)
          window.history.replaceState(window.history.state, "", hash || window.location.pathname + window.location.search);
      });

      instance.loadFromHTML(pages);
      bookRef.current = instance;
    });

    return () => {
      cancelled = true;
      targetRef.current = null;
      book?.destroy();
      bookRef.current = null;
    };
  }, [pageW, pageH, twoPages]);

  const next = useCallback(() => bookRef.current?.flipNext("bottom"), []);
  const prev = useCallback(() => bookRef.current?.flipPrev("bottom"), []);

  const goTo = (index: number) => {
    const book = bookRef.current;
    const first = views.find((v) => v.includes(index))?.[0];
    if (!book || first === undefined || first === views[view][0]) return;
    targetRef.current = first;
    book.flip(first, "bottom");
    targetRef.current = null; // used as the turn started; not kept if the book was busy turning
  };

  // Keyboard: arrows turn the pages, Escape closes the zoom and the panels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea, select")) return;
      if (e.key === "Escape") {
        setZoomed(false);
        setPanel(null);
      }
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Scrolling turns the pages: mouse wheel or trackpad
  useEffect(() => {
    const stage = stageRef.current;
    const turner = wheelTurner({
      isTurning: () => ["flipping", "user_fold"].includes(bookRef.current?.getState() ?? ""),
      turn: (direction) => (direction > 0 ? next() : prev()),
    });
    const onWheel = (e: WheelEvent) => {
      if (zoomed || e.ctrlKey || (e.target instanceof Element && e.target.closest("[data-own-scroll]"))) return;
      turner.onWheel(e);
    };
    stage?.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      stage?.removeEventListener("wheel", onWheel);
      turner.stop();
    };
  }, [next, prev, zoomed]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  // Zoomed in: the book follows the pointer (mouse or finger), so every corner can be read
  const panZoom = (e: { clientX: number; clientY: number }) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || !zoomRef.current) return;
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    zoomRef.current.style.transformOrigin = `${x}% ${y}%`;
  };
  const toggleZoom = () => {
    if (!zoomed && zoomRef.current) zoomRef.current.style.transformOrigin = "50% 50%";
    setZoomed(!zoomed);
  };

  const togglePanel = (p: Panel) => setPanel(panel === p ? null : p);
  const slideTo = () => {
    if (sliding !== null) goTo(views[sliding][0]);
    setSliding(null);
  };

  // A closed book sits in the middle: shifted by half a page
  const bookW = size ? size.w * (twoPages ? 2 : 1) : 0;
  const shift = !twoPages ? 0 : page === 0 ? -25 : page === TOTAL - 1 ? 25 : 0;
  const halfShown = size && shift ? size.w / 2 : bookW / 2;
  const small = (size?.stageW ?? 1024) < 640;
  // Corner arrows: beside the book where there is room, else over its lower corners
  const arrow = size ? Math.min(halfShown + 10, size.stageW / 2 - 45) : 0;
  const position = sliding ?? view;
  // Page edges show only on a side covered before and after the turn, so none hang in the air
  const settledView = Math.max(0, views.findIndex((v) => v.includes(settled)));
  const underLeft = Math.min(view, settledView, 3);
  const underRight = Math.min(views.length - 1 - Math.max(view, settledView), 3);

  return (
    <main ref={rootRef} className="fixed inset-0 flex flex-col bg-ink">
      <h1 className="sr-only">BOAT Seafood Restaurant menu book</h1>

      <div className="relative z-30 flex shrink-0 items-center justify-between gap-3 bg-ink px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-cream font-jost text-[12px] uppercase tracking-[2px]">
        <Link href="/" className="inline-flex items-center gap-2 hover:text-ocean transition-colors">
          <ArrowLeft size={16} aria-hidden /> Back to site
        </Link>
        <div className="flex items-center gap-2 sm:gap-5">
          <a
            href={MENU_BOOK_PDF_URL}
            download={MENU_BOOK_PDF_NAME}
            className="inline-flex items-center gap-2 rounded-full bg-ocean text-navy px-3.5 py-1.5 font-bold hover:bg-cream transition-colors"
          >
            <Download size={14} aria-hidden /> Download<span className="hidden sm:inline"> PDF</span>
          </a>
          <button type="button" onClick={toggleFullscreen} className="hidden sm:inline-flex items-center gap-2 uppercase tracking-[2px] hover:text-ocean transition-colors">
            {fullscreen ? "Exit full screen" : "Open full screen"} <Expand size={14} aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        role="region"
        aria-label="BOAT Seafood Restaurant menu book"
        className={`relative min-h-0 flex-1 overflow-hidden ${fullscreen ? "bg-white" : "bg-ink"}`}
      >
        <div className="absolute inset-0 opacity-60">
          <BrochureBackdrop />
        </div>

        {/* Server-rendered pages: what Google and screen readers read */}
        <div ref={sourceRef} className="sr-only">
          {MENU_BOOK_PAGES.map((p, i) => (
            <section key={i} className="flip-page bg-white" data-density="soft" aria-label={`Page ${i + 1}: ${p.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={menuBookImage(i)}
                alt={p.sections.length ? "" : `BOAT Seafood Restaurant menu: ${p.title.toLowerCase()}`}
                loading={i < 3 ? "eager" : "lazy"}
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-fill"
              />
              {p.sections.map((s) => (
                <div key={s.name} className="sr-only">
                  <h2>{s.name}</h2>
                  <ul>
                    {s.dishes.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {QR_LINKS[i] && (
                <a href={whatsapp()} target="_blank" rel="noopener" aria-label="Chat with BOAT on WhatsApp" className="absolute block" style={QR_LINKS[i]} />
              )}
            </section>
          ))}
        </div>

        <div
          ref={zoomRef}
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: zoomed ? `scale(${ZOOM})` : "none" }}
          onDoubleClick={(e) => {
            panZoom(e);
            setZoomed(true);
          }}
        >
          {size && (
            <div
              className="absolute left-1/2"
              style={{
                top: small ? 10 : 20,
                width: bookW,
                height: size.h,
                marginLeft: -bookW / 2,
                transform: `translateX(${shift}%)`,
                transition: `transform ${SLIDE_MS}ms ease`,
              }}
            >
              <div ref={mountRef} className={`menu-book-mount h-full w-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} />
              {ready && (
                <>
                  <Edges side="left" sheets={underLeft} />
                  <Edges side="right" sheets={underRight} />
                </>
              )}
            </div>
          )}
        </div>

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-navy/20 border-t-navy" aria-hidden="true" />
          </div>
        )}

        {zoomed && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 cursor-zoom-out touch-none"
            onPointerMove={panZoom}
            onPointerDown={panZoom}
            onDoubleClick={() => setZoomed(false)}
          />
        )}

        {ready && size && !zoomed && (
          <>
            {view > 0 && <CornerArrow back style={{ left: size.stageW / 2 - arrow - 32, top: size.h - 17 }} onClick={prev} />}
            {view < views.length - 1 && <CornerArrow style={{ left: size.stageW / 2 + arrow, top: size.h - 17 }} onClick={next} />}
          </>
        )}

        {/* Page slider, filled up to the open pages */}
        <input
          type="range"
          min={0}
          max={views.length - 1}
          value={position}
          disabled={!ready}
          aria-label="Go to page"
          aria-valuetext={`Page ${views[position]?.map((i) => i + 1).join("–")} of ${TOTAL}`}
          onChange={(e) => setSliding(Number(e.target.value))}
          onPointerUp={slideTo}
          onKeyUp={slideTo}
          onBlur={() => setSliding(null)}
          className="menu-book-slider absolute bottom-[2px] left-1/2 z-20 w-[min(700px,calc(100%-55px))] -translate-x-1/2 sm:bottom-[13px]"
          style={{ "--fill": `${((position + 1) / views.length) * 100}%` } as CSSProperties}
        />

        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-[5px] bg-white/85 px-2.5 text-black">
          <Tool label="Pages" onClick={() => togglePanel("pages")} active={panel === "pages"}>
            <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" fill="currentColor" />
          </Tool>
          <Tool label="Share" onClick={() => togglePanel("share")} active={panel === "share"}>
            <circle cx="5.5" cy="12" r="3" fill="currentColor" />
            <circle cx="18" cy="5.5" r="3" fill="currentColor" />
            <circle cx="18" cy="18.5" r="3" fill="currentColor" />
            <path d="M18 5.5 5.5 12 18 18.5" strokeWidth="1.8" />
          </Tool>
          <Tool label={zoomed ? "Zoom out" : "Zoom in"} onClick={toggleZoom} active={zoomed}>
            <circle cx="10" cy="9.5" r="7" fill="currentColor" />
            <path d="m15 14.5 6 6" strokeWidth="3" strokeLinecap="round" />
            <path d={zoomed ? "M7 9.5h6" : "M7 9.5h6M10 6.5v6"} stroke="#fff" strokeWidth="1.8" />
          </Tool>
          <Tool label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
            <path
              strokeWidth="2.4"
              d={
                fullscreen
                  ? "M9 3v4a2 2 0 0 1-2 2H3M15 3v4a2 2 0 0 0 2 2h4M9 21v-4a2 2 0 0 0-2-2H3M15 21v-4a2 2 0 0 1 2-2h4"
                  : "M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
              }
            />
          </Tool>
          <Tool label="Search" onClick={() => togglePanel("search")} active={panel === "search"}>
            <circle cx="9.5" cy="9.5" r="6.5" strokeWidth="2" />
            <path d="m14.5 14.5 6.5 6.5" strokeWidth="2.8" strokeLinecap="round" />
          </Tool>
          <Tool label={soundOn ? "Turn page sound off" : "Turn page sound on"} onClick={() => setSoundOn((v) => !v)}>
            <path d="M2 8.5h4.5L12 4v16l-5.5-4.5H2z" fill="currentColor" />
            <path
              strokeLinecap="round"
              strokeWidth={soundOn ? 1.4 : 1.8}
              d={soundOn ? "M14.8 9a4.2 4.2 0 0 1 0 6M17.2 7a7 7 0 0 1 0 10M19.6 5a10 10 0 0 1 0 14" : "m15 9.5 6 5m0-5-6 5"}
            />
          </Tool>
        </div>

        {panel === "pages" && (
          <PagesPanel
            current={page}
            onPick={(i) => {
              goTo(i);
              if (small) setPanel(null);
            }}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "share" && <SharePanel />}
        {panel === "search" && (
          <SearchPanel
            onPick={(i) => {
              goTo(i);
              setPanel(null);
            }}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </main>
  );
}

function Tool({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-[38px] w-[30px] items-center justify-center transition-opacity hover:opacity-60 sm:h-[46px] sm:w-11 ${active ? "opacity-60" : ""}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0" className="h-5 w-5 sm:h-[26px] sm:w-[26px]" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

// The curved arrow at a lower corner of the book
function CornerArrow({ back, style, onClick }: { back?: boolean; style: CSSProperties; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={back ? "Previous page" : "Next page"}
      className="absolute z-20 flex h-8 w-8 items-center justify-center text-black"
      style={style}
    >
      <svg viewBox="0 0 32 32" className={`h-8 w-8 ${back ? "-scale-x-100" : ""}`} aria-hidden="true">
        <path d="M18 4.5 30.5 13.5 18 22.5V17.6C10.5 17.4 5.2 20 1.5 27 2.2 16.8 8 9.8 18 9.4Z" fill="currentColor" />
      </svg>
    </button>
  );
}

// The edges of the pages lying under the open ones
function Edges({ side, sheets }: { side: "left" | "right"; sheets: number }) {
  if (sheets <= 0) return null;
  const right = side === "right";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0"
      style={{ [right ? "left" : "right"]: "100%", width: sheets * 2, filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.3))" }}
    >
      <div
        className="h-full w-full"
        style={{
          clipPath: right ? "polygon(0 0, 100% 6px, 100% calc(100% - 6px), 0 100%)" : "polygon(0 6px, 100% 0, 100% 100%, 0 calc(100% - 6px))",
          background: `repeating-linear-gradient(${right ? "to right" : "to left"}, #ededed 0 1.4px, #9d9d9d 1.4px 2px)`,
        }}
      />
    </div>
  );
}
