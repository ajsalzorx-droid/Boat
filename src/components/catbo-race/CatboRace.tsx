"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronsDown, ChevronsUp, Fish, Flag, Heart, Loader2, Play, RotateCcw, Trophy, X } from "lucide-react";
import type { Race, RaceState } from "./race";

// The Catbo Racing popup, opened from the peeking cat's "Press to play" (CatFishGrab.tsx). It is
// loaded only then, with the game (race.ts) and its pictures (/public/race), so the pages carry
// none of it. A tap, a click or Space jumps; Escape or X closes.
export default function CatboRace({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raceRef = useRef<Race | null>(null);
  const [state, setState] = useState<RaceState | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("./race")
      .then(({ startRace }) => startRace(canvasRef.current!, setState))
      .then((race) => {
        if (cancelled) return race.destroy();
        raceRef.current = race;
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      raceRef.current?.destroy();
      raceRef.current = null;
    };
  }, []);

  // The page behind does not scroll; Space jumps, Escape closes
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        raceRef.current?.jump();
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        raceRef.current?.cast();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const card = "bg-cream rounded-2xl px-7 py-7 text-center shadow-2xl max-w-sm w-full";
  const button =
    "inline-flex items-center justify-center gap-2 bg-navy text-cream rounded-full px-7 py-3.5 text-[12px] tracking-[3px] uppercase font-bold hover:bg-ocean hover:text-navy transition-colors";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Catbo Racing"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/60 backdrop-blur-sm p-0 md:p-6 font-jost"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full mx-3 h-[78dvh] rounded-3xl md:mx-0 md:h-auto md:max-w-5xl md:aspect-video overflow-hidden bg-[#f7e6d5] shadow-2xl">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none select-none"
          onPointerDown={(e) => {
            if (e.button === 0) raceRef.current?.jump();
          }}
        />
        {!state && !failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f7e6d5]">
            <Loader2 className="animate-spin text-navy" size={40} aria-label="Loading the race" />
          </div>
        )}

        {/* "Tap to jump" at the start of a race */}
        {state?.phase === "racing" && (
          <div
            aria-hidden={!state.hint}
            className={`absolute left-[44%] bottom-[31%] md:left-[40%] md:bottom-[56%] pointer-events-none transition-all duration-300 ${
              state.hint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white text-navy pl-2.5 pr-3.5 py-2 text-[13px] md:text-[15px] font-bold shadow-[0_6px_18px_-6px_rgba(0,48,73,0.55)] motion-safe:animate-bounce">
              <span className="w-6 h-6 rounded-full bg-offer text-white flex items-center justify-center">
                <ChevronsUp size={15} aria-hidden />
              </span>
              <span className="md:hidden">Tap to jump!</span>
              <span className="hidden md:inline">Press Space to jump!</span>
            </span>
          </div>
        )}

        {/* "Tap to fish" after that: by the fish button on a phone, near Catbo on a computer */}
        {state?.phase === "racing" && (
          <div
            aria-hidden={!state.fishHint}
            className={`absolute right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+4.75rem)] md:right-auto md:left-[40%] md:bottom-[56%] pointer-events-none transition-all duration-300 ${
              state.fishHint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <span className="relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white text-navy pl-2.5 pr-3.5 py-2 text-[13px] md:text-[15px] font-bold shadow-[0_6px_18px_-6px_rgba(0,48,73,0.55)] motion-safe:animate-bounce">
              <span className="w-6 h-6 rounded-full bg-ocean text-white flex items-center justify-center">
                <ChevronsDown size={15} aria-hidden />
              </span>
              <span className="md:hidden">Tap to fish!</span>
              <span className="hidden md:inline">Press ↓ to fish!</span>
              <span aria-hidden className="md:hidden absolute -bottom-1.5 right-6 w-3 h-3 rotate-45 bg-white" />
            </span>
          </div>
        )}

        {/* On a phone: a button to drop Catbo's line (on a computer, the down arrow) */}
        {state?.phase === "racing" && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              raceRef.current?.cast();
            }}
            aria-label="Drop the fishing line"
            className="md:hidden absolute right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] w-16 h-16 rounded-full bg-white/95 text-navy shadow-[0_6px_18px_-6px_rgba(0,48,73,0.6)] border-4 border-white flex flex-col items-center justify-center active:scale-95 touch-none"
          >
            <span className="text-[22px] leading-none" aria-hidden>
              🎣
            </span>
            <ChevronsDown size={16} aria-hidden className="-mt-0.5" />
          </button>
        )}

        {/* Distance and lives; the way out */}
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 md:inset-x-5 flex items-start justify-between gap-2 pointer-events-none">
          {state ? (
            <div className="flex flex-wrap gap-2 text-navy font-bold text-[14px] md:text-[16px]">
              <span className="inline-flex items-center gap-1.5 bg-white/90 rounded-full px-3.5 py-2 shadow-sm tabular-nums">
                <Flag size={16} aria-hidden /> {state.metres} m
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/90 rounded-full px-3.5 py-2 shadow-sm tabular-nums" aria-label={`${state.fish} fish caught`}>
                <Fish size={16} aria-hidden /> {state.fish}
              </span>
              <span className="inline-flex items-center gap-1 bg-white/90 rounded-full px-3 py-2 shadow-sm" aria-label={`${state.lives} lives left`}>
                {[0, 1, 2].map((i) => (
                  <Heart key={i} size={16} aria-hidden className={i < state.lives ? "fill-offer text-offer" : "text-navy/25"} />
                ))}
              </span>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the race"
            className="pointer-events-auto w-10 h-10 shrink-0 rounded-full bg-white/90 text-navy shadow flex items-center justify-center hover:bg-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Before the race, and after it */}
        {state && state.phase !== "racing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy/30 p-4">
            {state.phase === "ready" ? (
              <div className={card} role="status">
                <p className="text-[10px] tracking-[4px] uppercase text-ocean font-bold mb-2">Catbo Racing</p>
                <p className="font-playfair text-[28px] leading-tight font-bold text-navy mb-3">Surf with Catbo!</p>
                <p className="text-navy/75 text-[14px] mb-6">
                  <span className="hidden md:inline">Click or press Space</span>
                  <span className="md:hidden">Tap the screen</span> to jump over buoys. Dolphins leap over you: don&rsquo;t jump into them! To fish, <span className="hidden md:inline">press ↓</span><span className="md:hidden">tap 🎣</span>. You have 3 lives.
                </p>
                <button type="button" autoFocus className={button} onClick={() => raceRef.current?.start()}>
                  <Play size={16} className="fill-current" aria-hidden /> Start
                </button>
              </div>
            ) : (
              <div className={card} role="status">
                <p className="text-[10px] tracking-[4px] uppercase text-offer font-bold mb-2">Race over</p>
                <p className="font-playfair text-5xl font-bold text-navy mb-1">{state.metres} m</p>
                <p className="flex items-center justify-center gap-1.5 text-navy/75 text-[14px] mb-3">
                  <Fish size={15} aria-hidden /> {state.fish} fish caught
                </p>
                <p className="inline-flex items-center gap-1.5 text-navy text-[13px] font-semibold mb-6">
                  <Trophy size={15} aria-hidden /> Best: {state.best} m
                </p>
                <div>
                  <button type="button" autoFocus className={button} onClick={() => raceRef.current?.start()}>
                    <RotateCcw size={16} aria-hidden /> Race again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="bg-white rounded-xl px-5 py-3 text-navy">The race could not load. Please try again.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
