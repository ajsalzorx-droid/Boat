"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "@photo-sphere-viewer/core/index.css";

// The 360° walk through the restaurant. The Next and Previous buttons change place. Looking around:
// move the mouse, drag, or use two fingers on a trackpad or touch screen. Zoom with the buttons or
// a pinch. The viewer (three.js) and the photos download only when the tour comes near the screen.
//
// Between places Catbo's paw reaches down, grabs the screen like a sheet and pulls it away, showing
// the next place underneath. The sheet is a still of the current view on a 2D canvas: the photos
// swap behind it, so that heavy moment never shows, and nothing goes dark.

// A spot in a photo, read off a 1400 × 700 preview of it: where each place opens
const spot = (x: number, y: number) => ({ yaw: (x / 1400 - 0.5) * 2 * Math.PI, pitch: (0.5 - y / 700) * Math.PI });

const SCENES = [
  { id: "waterfront", start: spot(700, 340) },
  { id: "terrace", start: spot(1050, 350) },
  { id: "terrace-sunset", start: spot(600, 340) },
  { id: "dining-hall", start: spot(1000, 360) },
  { id: "dining-hall-evening", start: spot(540, 360) },
  { id: "kitchen", start: spot(620, 370) },
];

const ZOOM = 20;
const PAW = "/images/360/catbo-paw.webp";
const LOOK_SPEED = 0.004; // radians of view per pixel the mouse moves
const TRACKPAD_SPEED = 0.003; // radians of view per unit of two-finger travel on a trackpad
const MAX_PITCH = 1.4;

// The pull, in stages
const REACH_MS = 420; // the paw comes down
const GRAB_MS = 260; // it takes hold and the sheet creases
const PULL_MS = 760; // it pulls the sheet up and away
const GRIP_DEPTH = 0.3; // how far down the paw reaches, as a share of the tour's height
const PAW_SHOWN = 0.62; // at most this much of the paw image shows: its cut end stays off screen
const PULL_TRAVEL = 1.5; // how far the sheet goes, in tour heights
const SAG = 0.018; // how far the sheet gives as the paw takes hold, in tour heights
const CREASES = 11;
const PAW_CENTRE = "-38%"; // lines the toes up with the middle of the sheet

// Phones get lighter photos (3072 px, not 5120)
const isSmallScreen = () => window.innerWidth < 768;
const photo = (id: string, small: boolean) => `/images/360/${id}${small ? "-small" : ""}.webp`;

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t ** 2.4;

// One frame of the sheet: columns lifted more near the paw, so its lower edge bows up like cloth.
// gripY = where the paw holds it, in canvas pixels.
function drawSheet(ctx: CanvasRenderingContext2D, still: HTMLCanvasElement, gripY: number, grab: number, crease: number, pull: number) {
  const { width: W, height: H } = ctx.canvas;
  const cx = W / 2;
  const strip = Math.max(2, Math.round(W / 420)); // narrow, or the bowed edge shows as steps
  const liftAt = (x: number) => {
    const near = Math.exp(-(((x - cx) / (W * 0.42)) ** 2));
    return pull * H * PULL_TRAVEL * (0.45 + 0.55 * near) - grab * near * H * SAG;
  };

  ctx.clearRect(0, 0, W, H);
  for (let x = 0; x < W; x += strip) {
    const lift = Math.round(liftAt(x + strip / 2)); // whole pixels: fractions shimmer between strips
    if (pull > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.22)"; // soft shadow under the sheet's edge
      ctx.fillRect(x, H - lift, strip, H * 0.03);
    }
    ctx.drawImage(still, x, 0, strip, H, x, -lift, strip + 1, H);
  }
  if (crease <= 0) return;

  // Soft folds running out from the paw: thin near it, widening as they fade across the sheet
  const fromY = gripY - liftAt(cx);
  for (let i = 0; i < CREASES; i++) {
    const a = Math.PI * (0.08 + (0.84 * i) / (CREASES - 1)); // fan from right round to left
    const length = H * (0.5 + 0.22 * Math.sin(i * 2.4) ** 2);
    const dirX = Math.cos(a) * 1.5;
    const dirY = Math.sin(a);
    const startX = cx + dirX * H * 0.03;
    const startY = fromY + dirY * H * 0.03;
    const endX = cx + dirX * length;
    const endY = fromY + dirY * length;
    const half = H * (0.012 + 0.016 * Math.cos(i * 1.7) ** 2);
    const fold = (offset: number, rgb: string, strength: number) => {
      const paint = ctx.createLinearGradient(startX, startY, endX, endY);
      paint.addColorStop(0, `rgba(${rgb},0)`);
      paint.addColorStop(0.3, `rgba(${rgb},${strength * crease})`);
      paint.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = paint;
      ctx.beginPath();
      ctx.moveTo(startX + offset, startY);
      ctx.lineTo(endX + offset - dirY * half, endY + dirX * half);
      ctx.lineTo(endX + offset + dirY * half, endY - dirX * half);
      ctx.closePath();
      ctx.fill();
    };
    fold(0, "0,0,0", 0.16);
    fold(half * 1.1, "255,255,255", 0.14);
  }
}

export default function Tour360Viewer({ className }: { className: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const pawRef = useRef<HTMLImageElement>(null);
  const goRef = useRef<(by: 1 | -1) => void>(() => {});
  const [near, setNear] = useState(false);

  // Wait until the tour is close to the screen
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    const sheet = sheetRef.current;
    const paw = pawRef.current;
    const ctx = sheet?.getContext("2d");
    if (!near || !box || !sheet || !paw || !ctx) return;
    let viewer: import("@photo-sphere-viewer/core").Viewer | null = null;
    let cancelled = false;
    let scene = 0;
    let busy = false; // a change of place is running
    let frame = 0;
    let lastMouse: { x: number; y: number } | null = null;
    const small = isSmallScreen();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const still = document.createElement("canvas");

    // Fetched and decoded ahead of time, ready for the swap
    const ready = new Map<string, Promise<unknown>>();
    const prepare = (index: number) => {
      const { id } = SCENES[(index + SCENES.length) % SCENES.length];
      if (!viewer || ready.has(id)) return ready.get(id);
      const loading = viewer.textureLoader.preloadPanorama(photo(id, small)).catch(() => ready.delete(id));
      ready.set(id, loading);
      return loading;
    };
    const painted = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Covers the tour with a still of what is on screen
    const takeStill = () => {
      const view = box.querySelector("canvas");
      if (!view) return;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      const { width, height } = box.getBoundingClientRect();
      for (const c of [still, sheet]) {
        c.width = Math.round(width * scale);
        c.height = Math.round(height * scale);
      }
      still.getContext("2d")?.drawImage(view, 0, 0, still.width, still.height);
      drawSheet(ctx, still, 0, 0, 0, 0);
      sheet.style.visibility = "visible";
    };

    const playPull = () =>
      new Promise<void>((resolve) => {
        const H = sheet.getBoundingClientRect().height;
        const pawH = paw.getBoundingClientRect().height;
        const tip = Math.min(H * GRIP_DEPTH, pawH * PAW_SHOWN); // how far down the paw's tip gets
        const gripY = (tip * sheet.height) / H;
        const startedAt = performance.now();
        paw.style.visibility = "visible";
        const tick = (now: number) => {
          const t = now - startedAt;
          const reach = easeOut(clamp01(t / REACH_MS));
          const grab = easeOut(clamp01((t - REACH_MS) / GRAB_MS));
          const pull = easeIn(clamp01((t - REACH_MS - GRAB_MS) / PULL_MS));
          drawSheet(ctx, still, gripY, grab, Math.max(reach * 0.35, grab), pull);
          const y = -pawH + tip * reach + grab * H * SAG - pull * H * PULL_TRAVEL;
          paw.style.transform = `translate(${PAW_CENTRE}, ${y}px)`;
          if (t < REACH_MS + GRAB_MS + PULL_MS) frame = requestAnimationFrame(tick);
          else resolve();
        };
        frame = requestAnimationFrame(tick);
      });

    // One place on or back; the tour goes round in a loop
    const go = async (by: 1 | -1) => {
      if (!viewer || busy) return;
      busy = true;
      scene = (scene + by + SCENES.length) % SCENES.length;
      const next = SCENES[scene];
      try {
        if (!calm) takeStill();
        await prepare(scene);
        await viewer.setPanorama(photo(next.id, small), {
          position: next.start,
          zoom: ZOOM,
          showLoader: false,
          transition: calm,
        });
        await painted();
        if (!calm) await playPull();
      } catch (e) {
        console.error("Tour move failed:", e);
      }
      sheet.style.visibility = "hidden";
      paw.style.visibility = "hidden";
      busy = false;
      prepare(scene + 1);
      prepare(scene - 1);
    };
    goRef.current = go;

    // The view follows the mouse with no button down; dragging stays with the viewer
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.buttons !== 0 || !viewer) return;
      const before = lastMouse;
      lastMouse = { x: e.clientX, y: e.clientY };
      if (!before || busy) return;
      const { yaw, pitch } = viewer.getPosition();
      viewer.rotate({
        yaw: yaw - (e.clientX - before.x) * LOOK_SPEED,
        pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch + (e.clientY - before.y) * LOOK_SPEED)),
      });
    };
    const onPointerLeave = () => {
      lastMouse = null;
    };

    // Two fingers on a trackpad: the tour fills the page, so there is nothing to scroll instead
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // a pinch: the browser's own zoom
      e.preventDefault();
      if (!viewer || busy) return;
      const { yaw, pitch } = viewer.getPosition();
      viewer.rotate({
        yaw: yaw + e.deltaX * TRACKPAD_SPEED,
        pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch - e.deltaY * TRACKPAD_SPEED)),
      });
    };

    import("@photo-sphere-viewer/core").then(({ Viewer }) => {
      if (cancelled) return;
      viewer = new Viewer({
        container: box,
        panorama: photo(SCENES[0].id, small),
        defaultYaw: SCENES[0].start.yaw,
        defaultPitch: SCENES[0].start.pitch,
        defaultZoomLvl: ZOOM,
        navbar: ["zoom", "fullscreen"],
        // No wheel zoom: the page scrolls normally over the viewer
        mousewheel: false,
        touchmoveTwoFingers: false,
        loadingTxt: "Loading 360° view…",
        rendererParameters: { preserveDrawingBuffer: true }, // lets the still be copied from the view
      });
      viewer.addEventListener("ready", () => { prepare(1); prepare(-1); }, { once: true });
      box.addEventListener("pointermove", onPointerMove);
      box.addEventListener("pointerleave", onPointerLeave);
      box.addEventListener("wheel", onWheel, { passive: false });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      goRef.current = () => {};
      box.removeEventListener("pointermove", onPointerMove);
      box.removeEventListener("pointerleave", onPointerLeave);
      box.removeEventListener("wheel", onWheel);
      viewer?.destroy();
    };
  }, [near]);

  const arrow =
    "absolute top-1/2 -translate-y-1/2 z-40 flex items-center justify-center rounded-full bg-navy/80 text-white p-3 transition-colors hover:bg-ocean hover:text-navy";

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <div ref={boxRef} data-lenis-prevent className="absolute inset-0" />
      <canvas ref={sheetRef} aria-hidden className="absolute inset-0 z-20 w-full h-full pointer-events-none invisible" />
      {/* eslint-disable-next-line @next/next/no-img-element -- moved frame by frame, needs no optimising */}
      <img
        ref={pawRef}
        src={PAW}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute top-0 left-1/2 z-30 w-[120px] md:w-[180px] h-auto pointer-events-none invisible"
      />
      <button type="button" aria-label="Previous place" onClick={() => goRef.current(-1)} className={`${arrow} left-3 md:left-6`}>
        <ChevronLeft size={22} />
      </button>
      <button type="button" aria-label="Next place" onClick={() => goRef.current(1)} className={`${arrow} right-3 md:right-6`}>
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
