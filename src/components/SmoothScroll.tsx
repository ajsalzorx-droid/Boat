"use client";

import { useEffect, useLayoutEffect, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

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

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
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
