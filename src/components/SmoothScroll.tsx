"use client";

import { useEffect, useLayoutEffect, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

// The page's Lenis, while it runs. Lenis keeps its own scroll target, so a plain window.scrollTo
// is undone when Lenis is still gliding after a wheel or touch scroll: scroll with scrollPageTo
let activeLenis: Lenis | null = null;

export function scrollPageTo(top: number) {
  if (activeLenis) activeLenis.scrollTo(top, { duration: 1, force: true });
  else window.scrollTo({ top, behavior: "smooth" });
}

interface SmoothScrollProps {
  children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  const pathname = usePathname();
  // Admin and kitchen scroll inside their own panels; Lenis hijacks the wheel and blocks that.
  const disabled = pathname.startsWith("/admin") || pathname.startsWith("/kitchen");
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (disabled) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    let frame: number;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }

    frame = requestAnimationFrame(raf);
    lenisRef.current = lenis;
    activeLenis = lenis;

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
      if (activeLenis === lenis) activeLenis = null;
    };
  }, [disabled]);

  // New page: start at the top. Lenis keeps its own scroll position, so without this a link
  // opened the next page at the old page's scroll offset. (Links to #sections keep theirs.)
  // (Layout effect: runs before the new page is painted, so the old offset never shows.)
  useLayoutEffect(() => {
    if (!window.location.hash) lenisRef.current?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return <>{children}</>;
}
