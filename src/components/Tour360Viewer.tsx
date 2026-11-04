"use client";

import { useEffect, useRef, useState } from "react";
import "@photo-sphere-viewer/core/index.css";

// The 360° view of the restaurant entrance at Waterfront Market: drag with the mouse (or a finger)
// to look around, zoom with the buttons or a pinch. The viewer (three.js) and the 4096 × 2048 photo
// download only when it comes near the screen, so pages stay fast.
const PANORAMA = "/images/360/boat-entrance.webp";
// Start facing the BOAT entrance (it is a little left of the photo's centre)
const START_YAW = "-8deg";

export default function Tour360Viewer({ className }: { className: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  // Wait until the view is close to the screen
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
      viewer = new Viewer({
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
    });
    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [near]);

  return <div ref={boxRef} className={className} />;
}
