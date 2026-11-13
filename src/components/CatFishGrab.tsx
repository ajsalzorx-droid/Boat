"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Play } from "lucide-react";

// Catbo peeks in from the right edge, swipes the fish off the View Menu button and runs off with it.
// The clip (public/video/cat-grab.mp4) is filmed on green: each frame is keyed to transparent on a
// canvas. The clip is placed from the button's position every frame, so it lines up at every screen
// size. Clip coordinates below are in its own 470 × 836 pixels.
const CLIP = "/video/cat-grab.mp4";
const CLIP_W = 470;
const CLIP_H = 836;
const FPS = 25;
const GRAB_FRAME = 159; // the paw's lowest point: it takes the fish here
// Paw tip from GRAB_FRAME until the cat is gone, one point per frame (measured from the clip)
const PAW = [
  [222, 748], [230, 744], [241, 733], [252, 720], [265, 711], [281, 704],
  [301, 697], [328, 689], [363, 683], [407, 677], [443, 675], [462, 669],
];
// The clip's right edge cuts through the cat, so the cat is sized to fit between the button and
// the screen edge: at most this many px of it go past the edge
const EDGE_OVERFLOW = 8;
const LOAD_MS = 1000; // start downloading the clip once the page has settled
const FIRST_RUN_MS = 3000;
const REPEAT_MS = 7000; // pause after the cat has left before it comes again
const FISH_AWAY_MS = 3000;
// While the cat is in view, a "Press to play" bubble sits by its head, and the head can be pressed
// too: both open Catbo Racing. In the clip's pixels: the head's box, and when it is in view (s)
const HEAD = { l: 110, t: 30, r: 470, b: 380 };
const PLAY_FROM = 0.45;
const PLAY_TO = 6.4;

export default function CatFishGrab({
  target,
  fishSrc,
  onFishGone,
  onPlay,
}: {
  target: RefObject<HTMLElement | null>;
  fishSrc: string;
  onFishGone: (gone: boolean) => void;
  onPlay?: () => void;
}) {
  const playRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onFishGoneRef = useRef(onFishGone);

  useEffect(() => {
    onFishGoneRef.current = onFishGone;
  }, [onFishGone]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = boxRef.current!;
    const play = playRef.current;
    const canvas = canvasRef.current!;
    const video = videoRef.current!;
    const ctx = canvas.getContext("2d")!;
    // Keying happens on a second canvas, so the fish can be drawn under the paw
    const work = document.createElement("canvas");
    const wctx = work.getContext("2d", { willReadFrequently: true })!;
    const fish = new Image();
    fish.src = fishSrc;

    let raf = 0;
    let running = false;
    let grabbed = false;
    let keyedTime = -1;
    const timeouts: number[] = [];

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      box.style.display = "none";
      video.pause();
    };

    const frame = () => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const btn = target.current?.getBoundingClientRect();
      if (!btn || !btn.width) return stop();

      // Paw at the grab lands on the button centre
      const toEdge = window.innerWidth - (btn.left + btn.width / 2);
      const scale = (toEdge + EDGE_OVERFLOW) / (CLIP_W - PAW[0][0]);
      const cssW = CLIP_W * scale;
      const cssH = CLIP_H * scale;
      canvas.style.left = `${btn.left + btn.width / 2 - PAW[0][0] * scale}px`;
      canvas.style.top = `${btn.top + btn.height / 2 - PAW[0][1] * scale}px`;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      // The head, to press, with its bubble, while the cat is in view
      if (play) {
        const inView = video.currentTime > PLAY_FROM && video.currentTime < PLAY_TO;
        play.style.display = inView ? "block" : "none";
        if (inView) {
          const left = btn.left + btn.width / 2 + (HEAD.l - PAW[0][0]) * scale;
          const top = btn.top + btn.height / 2 + (HEAD.t - PAW[0][1]) * scale;
          play.style.left = `${left}px`;
          play.style.top = `${top}px`;
          play.style.width = `${Math.max(0, Math.min(window.innerWidth - left, (HEAD.r - HEAD.l) * scale))}px`;
          play.style.height = `${(HEAD.b - HEAD.t) * scale}px`;
        }
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.min(CLIP_W, Math.round(cssW * dpr));
      const ph = Math.round((pw * CLIP_H) / CLIP_W);
      if (canvas.width !== pw) {
        canvas.width = work.width = pw;
        canvas.height = work.height = ph;
        keyedTime = -1;
      }

      // Green -> transparent (the cat has no green, so any green left at the edges is removed too)
      if (video.currentTime !== keyedTime) {
        keyedTime = video.currentTime;
        wctx.drawImage(video, 0, 0, pw, ph);
        const img = wctx.getImageData(0, 0, pw, ph);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const m = d[i] > d[i + 2] ? d[i] : d[i + 2];
          const spill = d[i + 1] - m;
          if (spill > 70) d[i + 3] = 0;
          else {
            if (spill > 25) d[i + 3] = (255 * (70 - spill)) / 45;
            if (spill > 0) d[i + 1] = m;
          }
        }
        wctx.putImageData(img, 0, 0);
      }

      ctx.clearRect(0, 0, pw, ph);
      const f = Math.floor(video.currentTime * FPS);
      if (f >= GRAB_FRAME) {
        if (!grabbed) {
          grabbed = true;
          onFishGoneRef.current(true);
          timeouts.push(window.setTimeout(() => onFishGoneRef.current(false), FISH_AWAY_MS));
        }
        // The fish rides in the paw, same size as on the button (icon is 400 × 451, shown object-cover)
        const i = f - GRAB_FRAME;
        const p = PAW[Math.min(i, PAW.length - 1)];
        const k = pw / CLIP_W;
        const x = (p[0] + Math.max(0, i - PAW.length + 1) * 40) * k;
        const y = p[1] * k;
        const size = (btn.width * pw) / cssW;
        const h = (size * 451) / 400;
        if (fish.complete) ctx.drawImage(fish, x - size / 2, y - h / 2, size, h);
      }
      ctx.drawImage(work, 0, 0);
    };

    const run = () => {
      if (running) return;
      // Background tab or button not shown: try again later
      if (document.hidden || !target.current?.offsetWidth) return next();
      running = true;
      grabbed = false;
      video.currentTime = 0;
      video
        .play()
        .then(() => {
          box.style.display = "block";
          frame();
        })
        .catch(() => {
          stop();
          next();
        });
    };
    const next = () => {
      timeouts.push(window.setTimeout(run, REPEAT_MS));
    };
    video.onended = () => {
      stop();
      next();
    };

    timeouts.push(
      window.setTimeout(() => {
        video.src = CLIP;
        video.load();
      }, LOAD_MS),
      window.setTimeout(run, FIRST_RUN_MS),
    );

    return () => {
      timeouts.forEach(clearTimeout);
      stop();
      video.onended = null;
      onFishGoneRef.current(false);
    };
  }, [target, fishSrc]);

  return (
    <>
      <div ref={boxRef} className="fixed inset-0 z-[45] overflow-hidden pointer-events-none" style={{ display: "none" }}>
        <canvas ref={canvasRef} className="absolute" aria-hidden />
        {onPlay && (
          <button
            ref={playRef}
            type="button"
            onClick={onPlay}
            aria-label="Press to play Catbo Racing"
            className="absolute pointer-events-auto cursor-pointer bg-transparent group"
            style={{ display: "none" }}
          >
            <span className="absolute right-full top-[38%] -translate-y-1/2 mr-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white text-navy pl-2.5 pr-3.5 py-2 text-[12px] md:text-[13px] font-bold shadow-[0_6px_18px_-6px_rgba(0,48,73,0.55)] motion-safe:animate-[catbo-nudge_1.6s_ease-in-out_infinite] group-hover:bg-navy group-hover:text-cream">
              <span className="w-6 h-6 rounded-full bg-offer text-white flex items-center justify-center">
                <Play size={12} className="fill-current ml-0.5" aria-hidden />
              </span>
              Press to play!
              <span aria-hidden className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-inherit" />
            </span>
          </button>
        )}
      </div>
      {/* Decoding needs the video on the page (iOS skips hidden ones); it is 1px and invisible */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="none"
        aria-hidden
        className="fixed bottom-0 right-0 w-px h-px opacity-0 pointer-events-none"
      />
    </>
  );
}
