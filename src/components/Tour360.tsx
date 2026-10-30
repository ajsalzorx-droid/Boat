"use client";

import { useEffect, useRef, useState } from "react";
import "@photo-sphere-viewer/core/index.css";

// 360° view of the restaurant entrance at Waterfront Market: drag with the mouse (or a finger)
// to look around, zoom with the buttons or a pinch. The viewer (three.js) and the 4096 × 2048 photo
// download only when the section comes near the screen, so the homepage stays fast.
const PANORAMA = "/images/360/boat-entrance.webp";
// Start facing the BOAT entrance (it is a little left of the photo's centre)
const START_YAW = "-8deg";

export default function Tour360() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  // Wait until the section is close to the screen
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !boxRef.current) return;
    let viewer: { destroy: () => void } | null = null;
    let cancelled = false;
    import("@photo-sphere-viewer/core").then(({ Viewer }) => {
      if (cancelled || !boxRef.current) return;
      const v = new Viewer({
        container: boxRef.current,
        panorama: PANORAMA,
        defaultYaw: START_YAW,
        defaultPitch: "-4deg",
        defaultZoomLvl: 30,
        navbar: ["zoom", "fullscreen"],
        // No wheel zoom and no on-screen hints: the page scrolls normally over the viewer;
        // zoom with the buttons or a pinch
        mousewheel: false,
        touchmoveTwoFingers: false,
        loadingTxt: "Loading 360° view…",
      });
      viewer = v;
    });
    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [near]);

  return (
    <section className="bg-ink py-20 md:py-28 px-6 md:px-20" aria-labelledby="tour-title">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-semibold mb-4">
            <span className="w-8 h-[1px] bg-ocean" /> Virtual Tour <span className="w-8 h-[1px] bg-ocean" />
          </span>
          <h2 id="tour-title" className="font-playfair text-[clamp(30px,4vw,52px)] font-bold text-white leading-tight">
            Take a <span className="italic text-ocean">360°</span> Look Around
          </h2>
          <p className="text-white/60 text-[14px] mt-3">Drag to explore our entrance at Waterfront Market, Deira.</p>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-navy">
          <div ref={boxRef} className="w-full h-[60svh] min-h-[340px] max-h-[640px]" />
        </div>
      </div>
    </section>
  );
}
