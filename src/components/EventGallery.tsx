"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { EventPhoto } from "@/lib/events";

// An event's photos: a grid, and a full-screen viewer (arrows, arrow keys, swipe, Esc). Each photo is
// a real link to its file, so it also works without JavaScript and Google can find it.

const SWIPE = 45; // px

export default function EventGallery({ photos, title }: { photos: EventPhoto[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isOpen = open !== null;
  const count = photos.length;

  const go = (step: number) => setOpen((i) => (i === null ? i : (i + step + count) % count));

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
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {photos.map((p, i) => (
          <li key={`${p.src}-${i}`}>
            <a
              href={p.src}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return; // a new tab was asked for
                e.preventDefault();
                setOpen(i);
              }}
              className="group relative block aspect-[3/4] cursor-zoom-in overflow-hidden rounded-xl bg-navy/10 outline-offset-4 focus-visible:outline-2 focus-visible:outline-navy"
            >
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes="(min-width: 1024px) 24vw, (min-width: 768px) 31vw, 48vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
              />
            </a>
          </li>
        ))}
      </ul>

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
