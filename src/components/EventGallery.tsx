"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { EventPhoto } from "@/lib/events";

// An event's photos: a grid (four, the rest behind "View more"), and a full-screen viewer of all of
// them (arrows, arrow keys, swipe, Esc). Every photo is in the HTML as a real link to its file, so
// Google can find it; the hidden ones are not downloaded until they are shown.

const FIRST = 4;
const SWIPE = 45; // px

export default function EventGallery({ photos, title }: { photos: EventPhoto[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const gridRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isOpen = open !== null;
  const count = photos.length;

  const go = (step: number) => setOpen((i) => (i === null ? i : (i + step + count) % count));

  const toggleAll = () => {
    flushSync(() => setShowAll(!showAll));
    // Back to four: the page got shorter above the button, so bring the photos back into view
    if (showAll) gridRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  };

  // showModal keeps the keyboard inside the viewer (and gives it back to the photo when it closes);
  // the page behind does not scroll
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    dialog.showModal();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else return;
    e.preventDefault();
  };

  const photo = open === null ? null : photos[open];
  const arrow =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-white hover:text-navy sm:h-12 sm:w-12";

  return (
    <>
      <ul ref={gridRef} id="event-photos" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
        {photos.map((p, i) => (
          <li key={`${p.src}-${i}`} hidden={!showAll && i >= FIRST}>
            <a
              href={p.src}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return; // a new tab was asked for
                e.preventDefault();
                setOpen(i);
              }}
              className="group relative block aspect-[3/4] cursor-pointer overflow-hidden rounded-xl bg-navy/10 outline-offset-4 focus-visible:outline-2 focus-visible:outline-navy"
            >
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes="(min-width: 768px) 24vw, 48vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
              />
            </a>
          </li>
        ))}
      </ul>

      {count > FIRST && (
        <div className="mt-8 flex justify-center md:mt-10">
          <button
            type="button"
            onClick={toggleAll}
            aria-expanded={showAll}
            aria-controls="event-photos"
            className="inline-flex items-center justify-center gap-3 rounded-full border border-navy/30 px-8 py-4 text-[11px] font-bold uppercase tracking-[2px] text-navy transition-colors hover:bg-navy hover:text-cream"
          >
            {showAll ? "View less" : `View more (${count - FIRST})`}
            <ChevronDown size={16} aria-hidden className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-label={`${title}: photos`}
        data-lenis-prevent
        onClose={() => setOpen(null)}
        onKeyDown={onKeyDown}
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden overscroll-contain bg-ink/95 p-0 text-white backdrop:bg-ink/80"
      >
        {photo && open !== null && (
          <div
            className="flex h-full w-full flex-col"
            onTouchStart={(e) => {
              touchStart.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
            }}
            onTouchEnd={(e) => {
              const start = touchStart.current;
              touchStart.current = null;
              if (!start || count < 2) return;
              const dx = e.changedTouches[0].clientX - start.x;
              const dy = e.changedTouches[0].clientY - start.y;
              if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <p aria-live="polite" className="text-[13px] tabular-nums text-white/80">
                <span className="sr-only">Photo </span>
                {open + 1} / {count}
              </p>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close photos"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white hover:text-navy"
              >
                <X size={22} aria-hidden />
              </button>
            </div>
            {/* A click beside the photo closes the viewer */}
            <div
              className="relative min-h-0 flex-1"
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(null);
              }}
            >
              <div className="pointer-events-none absolute inset-x-2 bottom-4 top-0 sm:inset-x-20 sm:bottom-6">
                <Image key={photo.src} src={photo.src} alt={photo.alt} fill sizes="100vw" loading="eager" className="object-contain" />
              </div>
              {count > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={`${arrow} left-2 sm:left-4`}>
                    <ChevronLeft size={24} aria-hidden />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Next photo" className={`${arrow} right-2 sm:right-4`}>
                    <ChevronRight size={24} aria-hidden />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
