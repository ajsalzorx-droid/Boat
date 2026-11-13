"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Hand, Maximize, Minimize, Mouse } from "lucide-react";
import "@photo-sphere-viewer/core/index.css";

// The 360° walk through the restaurant. The Next and Previous buttons below the photo change place
// with a cube turn: a still of the old view and the live new view are two sides of a cube that
// rotates. Visitors who ask their system for less motion get a plain swap.
// The next and previous photos are loaded ahead.
// Looking around takes the left mouse button held down while dragging, one finger dragged on a
// touch screen (two fingers pinch to zoom and turn the view as they move), or two fingers moved
// on a trackpad (up, down or sideways). The mouse wheel or a trackpad pinch zooms. A plain mouse move
// leaves the view still. A hint says how; it hides while the visitor looks around and comes back.
// The viewer (three.js) and the photos download only when the tour comes near the screen.

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
const TURN_MS = 900; // the cube turn between places


const DRAG_SPEED = 0.005; // radians of view per pixel of a mouse or finger drag
const TRACKPAD_SPEED = 0.003; // radians of view per unit of sideways two-finger travel on a trackpad
const WHEEL_ZOOM = 0.05; // zoom levels per unit of scroll: one mouse-wheel notch is about 5 levels
const PINCH_WHEEL_ZOOM = 0.4; // a trackpad pinch sends small steps, so each counts for more
const PINCH_SPEED = 0.25; // zoom levels per pixel the two fingers move apart
const PINCH_START = 20; // pixels the gap between two fingers must change before they zoom
const PAN_START = 8; // pixels two fingers must move together before they turn the view
const midpoint1 = (t: TouchList) => ({ x: t[0].clientX, y: t[0].clientY });
const midpoint2 = (t: TouchList) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
const MAX_PITCH = 1.4;
const LEFT_BUTTON = 0;

// Phones get lighter photos (3072 px, not 5120)
const isSmallScreen = () => window.innerWidth < 768;
const photo = (id: string, small: boolean) => `/images/360/${id}${small ? "-small" : ""}.webp`;

const spread = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

export default function Tour360Viewer({ className }: { className: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLCanvasElement>(null);
  const goRef = useRef<(by: 1 | -1) => void>(() => {});
  const [near, setNear] = useState(false);
  const [touch, setTouch] = useState(false); // which hint to show
  const [hint, setHint] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  // Full screen keeps the photo and the buttons together. Where the browser has no full screen
  // for a page element (iPhone Safari), the tour is pinned over the whole window instead.
  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    if (!full || document.fullscreenElement) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [full]);
  const toggleFull = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) return void document.exitFullscreen().catch(() => {});
    if (full) return setFull(false);
    if (el.requestFullscreen) el.requestFullscreen().catch(() => setFull(true));
    else setFull(true);
  };

  // Wait until the tour is close to the screen
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    setTouch(window.matchMedia("(pointer: coarse), (hover: none)").matches);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    const still = stillRef.current;
    const stage = box?.parentElement;

    if (!near || !box || !still || !stage) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // a plain swap for them
    let viewer: import("@photo-sphere-viewer/core").Viewer | null = null;
    let cancelled = false;
    let scene = 0;
    let busy = false; // a change of place is running
    let drag: { x: number; y: number } | null = null; // left button held
    let finger: { x: number; y: number } | null = null; // one finger down: looks around
    let fingers: { spread: number; x: number; y: number } | null = null; // two fingers down: zoom and turn
    let twoStart = { spread: 0, x: 0, y: 0 }; // where the two fingers came down
    let twoMode: "pinch" | "pan" | null = null; // what the two fingers are doing
    const small = isSmallScreen();

    // Fetched and decoded ahead of time, so a change of place is quick
    const ready = new Map<string, Promise<unknown>>();
    const prepare = (index: number) => {
      const { id } = SCENES[(index + SCENES.length) % SCENES.length];
      if (!viewer || ready.has(id)) return ready.get(id);
      const loading = viewer.textureLoader.preloadPanorama(photo(id, small)).catch(() => ready.delete(id));
      ready.set(id, loading);
      return loading;
    };

    // A copy of the view as it is now, laid over the viewer while the next place is set up
    const takeStill = () => {
      const view = box.querySelector("canvas");
      if (!view) return false;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = box.getBoundingClientRect();
      still.width = Math.round(width * scale);
      still.height = Math.round(height * scale);
      still.getContext("2d")?.drawImage(view, 0, 0, still.width, still.height);
      return true;
    };
    const painted = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // The old place and the new one are two sides of a cube that turns: Next turns it to the left
    // (the new place comes in from the right), Previous to the right
    const cubeTurn = (by: 1 | -1) => {
      const half = box.getBoundingClientRect().width / 2;
      stage.style.perspective = `${Math.round(half * 4)}px`;
      const face = (deg: number) => `translateZ(${-half}px) rotateY(${deg}deg) translateZ(${half}px)`;
      const timing: KeyframeAnimationOptions = { duration: TURN_MS, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" };
      const out = still.animate([{ transform: face(0) }, { transform: face(by * -90) }], timing);
      const into = box.animate([{ transform: face(by * 90) }, { transform: face(0) }], timing);
      return Promise.all([out.finished, into.finished]).finally(() => {
        out.cancel();
        into.cancel();
      });
    };

    // One place on or back; the tour goes round in a loop
    const go = async (by: 1 | -1) => {
      if (!viewer || busy) return;
      busy = true;
      scene = (scene + by + SCENES.length) % SCENES.length;
      const next = SCENES[scene];
      setHint(false);
      const hasStill = !calm && takeStill();
      try {
        if (hasStill) still.style.visibility = "visible"; // the old place stays on screen meanwhile
        await prepare(scene);
        await viewer.setPanorama(photo(next.id, small), { position: next.start, zoom: ZOOM, showLoader: false, transition: false });
        if (hasStill) {
          await painted();
          await cubeTurn(by);
        }
      } catch (e) {
        console.error("Tour move failed:", e);
      }
      still.style.visibility = "hidden";
      busy = false;
      setHint(true);
      prepare(scene + 1);
      prepare(scene - 1);
    };
    goRef.current = go;

    // Turns the view by a move of dx, dy pixels
    const look = (dx: number, dy: number, speed: number) => {
      if (!viewer || busy) return;
      const { yaw, pitch } = viewer.getPosition();
      viewer.rotate({
        yaw: yaw - dx * speed,
        pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch + dy * speed)),
      });
    };

    // Left button: held down and dragged. The hint hides meanwhile and comes back on release.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== LEFT_BUTTON) return;
      // The viewer's own buttons (zoom) keep their clicks
      if ((e.target as Element | null)?.closest(".psv-navbar")) return;
      // Stops the browser selecting text or starting a native drag, which would cancel this one
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY };
      try {
        box.setPointerCapture(e.pointerId); // keeps turning if the drag leaves the view
      } catch {}
      setHint(false);
    };
    const endDrag = () => {
      if (!drag) return;
      drag = null;
      setHint(true);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag || e.pointerType !== "mouse") return;
      // The button was let go somewhere the release was not seen
      if ((e.buttons & 1) === 0) return endDrag();
      look(e.clientX - drag.x, e.clientY - drag.y, DRAG_SPEED);
      drag = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== LEFT_BUTTON) return;
      endDrag();
    };
    const onDragStart = (e: DragEvent) => e.preventDefault();

    // One finger drags the view round. Two fingers either pinch to zoom or, moved together (up,
    // down or sideways), turn the view. Which one is settled by the first few pixels of the move
    // and kept until the fingers lift, so a two-finger turn never zooms by accident (the gap
    // between two fingers always wobbles a little). The hint hides meanwhile.
    const track = (t: TouchList) => {
      finger = t.length === 1 ? midpoint1(t) : null;
      if (t.length === 2) {
        const mid = midpoint2(t);
        fingers = { spread: spread(t), ...mid };
        twoStart = { spread: fingers.spread, ...mid };
        twoMode = null;
      } else fingers = null;
    };
    const onTouchStart = (e: TouchEvent) => {
      track(e.touches);
      setHint(false);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!viewer) return;
      if (finger && e.touches.length === 1) {
        e.preventDefault(); // the drag turns the view instead of pulling the page
        const now = midpoint1(e.touches);
        look(now.x - finger.x, now.y - finger.y, DRAG_SPEED);
        finger = now;
      } else if (fingers && e.touches.length === 2) {
        e.preventDefault(); // or the browser zooms the page
        const gap = spread(e.touches);
        const mid = midpoint2(e.touches);
        if (!twoMode) {
          const opened = Math.abs(gap - twoStart.spread);
          const moved = Math.hypot(mid.x - twoStart.x, mid.y - twoStart.y);
          if (opened > PINCH_START && opened > moved) twoMode = "pinch";
          else if (moved > PAN_START) twoMode = "pan";
        }
        if (twoMode === "pinch") {
          viewer.zoom(Math.max(0, Math.min(100, viewer.getZoomLevel() + (gap - fingers.spread) * PINCH_SPEED)));
        } else if (twoMode === "pan") {
          look(mid.x - fingers.x, mid.y - fingers.y, DRAG_SPEED);
        }
        fingers = { spread: gap, ...mid };
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      // Lifting one of two fingers carries on with the one left, without a jump
      if (e.touches.length > 0) return track(e.touches);
      finger = null;
      fingers = null;
      setHint(true);
    };

    // A trackpad pinch (sent as a scroll with Ctrl) zooms. Two fingers moved on a trackpad, up,
    // down or sideways, turn the view. Only a real mouse wheel zooms on a plain scroll: it is told
    // apart by its notches, which come as whole lines, or as steps of exactly 120 (wheelDelta).
    // Anything else is taken as a trackpad, so a two-finger swipe never zooms by mistake.
    // Scroll events that follow each other closely are one gesture. A wheel's notches are all the
    // same size, while a swipe speeds up and slows down; as soon as a gesture shows a step that
    // is not a notch it counts as a swipe from then on, and any zoom it made so far is undone.
    const gesture = { last: -Infinity, pad: false, notch: 0, zoomAtStart: 0 };
    const isWheelNotch = (e: WheelEvent) => {
      if (e.deltaMode === 1) return true;
      if (e.deltaX !== 0 || e.deltaY === 0) return false;
      const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      if (typeof legacy === "number" && legacy !== 0 && legacy % 120 !== 0) return false;
      return Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // or the page (or, on a pinch, the browser) zooms instead
      if (!viewer || busy) return;
      const lines = e.deltaMode === 1 ? 33 : 1; // some mice report lines, not pixels
      if (!e.ctrlKey) {
        const size = Math.abs(e.deltaY);
        if (e.timeStamp - gesture.last > 300) {
          Object.assign(gesture, { pad: false, notch: size, zoomAtStart: viewer.getZoomLevel() });
        }
        gesture.last = e.timeStamp;
        // Notches are all one size (a fast spin can send two or three at once)
        const sameNotch = gesture.notch > 0 && size % gesture.notch === 0;
        if (!gesture.pad && (!isWheelNotch(e) || !sameNotch)) {
          gesture.pad = true;
          viewer.zoom(gesture.zoomAtStart); // a swipe taken for a wheel at first: undo its zoom
        }
        if (gesture.pad) return look(-e.deltaX, -e.deltaY, TRACKPAD_SPEED);
      }
      const step = (e.ctrlKey ? PINCH_WHEEL_ZOOM : WHEEL_ZOOM) * e.deltaY * lines;
      viewer.zoom(Math.max(0, Math.min(100, viewer.getZoomLevel() - step)));
    };

    import("@photo-sphere-viewer/core").then(({ Viewer }) => {
      if (cancelled) return;
      viewer = new Viewer({
        container: box,
        panorama: photo(SCENES[0].id, small),
        defaultYaw: SCENES[0].start.yaw,
        defaultPitch: SCENES[0].start.pitch,
        defaultZoomLvl: ZOOM,
        // Full screen is the View button below, so Previous and Next stay on screen with it
        navbar: ["zoom"],
        // The viewer's own drag and wheel are off: looking around and zooming are handled above
        mousemove: false,
        mousewheel: false,
        touchmoveTwoFingers: false,
        loadingTxt: "Loading 360° view…",
        rendererParameters: { preserveDrawingBuffer: true }, // lets the cube turn copy the view
      });
      viewer.addEventListener("ready", () => { prepare(1); prepare(-1); }, { once: true });
      box.addEventListener("pointerdown", onPointerDown);
      box.addEventListener("pointermove", onPointerMove);
      box.addEventListener("pointerup", onPointerUp);
      box.addEventListener("pointercancel", endDrag);
      box.addEventListener("lostpointercapture", endDrag);
      box.addEventListener("dragstart", onDragStart);
      box.addEventListener("touchstart", onTouchStart, { passive: true });
      box.addEventListener("touchmove", onTouchMove, { passive: false });
      box.addEventListener("touchend", onTouchEnd, { passive: true });
      box.addEventListener("wheel", onWheel, { passive: false });
    });

    return () => {
      cancelled = true;
      goRef.current = () => {};
      box.removeEventListener("pointerdown", onPointerDown);
      box.removeEventListener("pointermove", onPointerMove);
      box.removeEventListener("pointerup", onPointerUp);
      box.removeEventListener("pointercancel", endDrag);
      box.removeEventListener("lostpointercapture", endDrag);
      box.removeEventListener("dragstart", onDragStart);
      box.removeEventListener("touchstart", onTouchStart);
      box.removeEventListener("touchmove", onTouchMove);
      box.removeEventListener("touchend", onTouchEnd);
      box.removeEventListener("wheel", onWheel);
      viewer?.destroy();
    };
  }, [near]);

  const navButton =
    "flex min-w-0 items-center justify-center gap-1.5 md:gap-2 rounded-full border border-white/20 px-2 sm:px-4 md:px-5 py-2.5 font-jost text-[12px] sm:text-[13px] md:text-[14px] uppercase tracking-[1px] sm:tracking-[2px] text-white whitespace-nowrap transition-colors hover:bg-ocean hover:border-ocean hover:text-navy";

  return (
    <div
      ref={wrapRef}
      className={`flex flex-col ${className} ${full ? "fixed! inset-0 z-[200] h-dvh! w-screen!" : ""}`}
    >
      <div className="relative flex-1 min-h-0 overflow-hidden select-none">
      <div ref={boxRef} data-lenis-prevent className="absolute inset-0 cursor-grab active:cursor-grabbing backface-hidden" />
      <canvas
        ref={stillRef}
        aria-hidden
        className="absolute inset-0 z-20 w-full h-full pointer-events-none invisible backface-hidden"
      />
      {/* How to look around: hidden while the visitor drags, back when they let go */}
      <div
        role="status"
        className={`absolute left-1/2 -translate-x-1/2 bottom-14 md:bottom-20 z-30 items-center gap-2 rounded-full bg-navy/85 text-white px-4 py-2 md:py-2.5 font-jost text-[12px] md:text-[13px] pointer-events-none whitespace-nowrap transition-opacity duration-500 ${
          touch ? "flex" : "hidden md:flex" /* the mouse hint is left out on phone-sized screens */
        } ${hint ? "opacity-100" : "opacity-0"}`}
      >
        {touch ? <Hand size={16} aria-hidden /> : <Mouse size={18} aria-hidden />}
        {touch ? "Drag to look around" : "Hold the left mouse button and drag to look around"}
      </div>
      </div>
      {/* Previous and Next, below the photo */}
      <div className="grid grid-cols-3 sm:flex shrink-0 items-center justify-center gap-2 sm:gap-3 md:gap-4 w-full max-w-md sm:max-w-none mx-auto px-4 py-3 md:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" aria-label="Previous place" onClick={() => goRef.current(-1)} className={navButton}>
          <ChevronLeft size={18} aria-hidden />
          Previous
        </button>
        <button type="button" aria-label={full ? "Exit full screen" : "View full screen"} onClick={toggleFull} className={navButton}>
          {full ? <Minimize size={16} aria-hidden /> : <Maximize size={16} aria-hidden />}
          {full ? "Exit" : "View"}
        </button>
        <button type="button" aria-label="Next place" onClick={() => goRef.current(1)} className={navButton}>
          Next
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

