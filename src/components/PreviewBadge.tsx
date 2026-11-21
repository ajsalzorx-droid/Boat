"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Shown only to an SEO Studio user in preview (draft) mode, never to visitors: the page shows
// saved changes that are not published yet. Hidden inside the studio's own preview frame.
export default function PreviewBadge() {
  const pathname = usePathname();
  const [inFrame, setInFrame] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window is only known in the browser
    setInFrame(window.self !== window.top);
  }, []);

  if (inFrame) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex items-center gap-3 bg-navy text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xl">
      Preview: showing unpublished changes
      {/* A plain link (no prefetch): following it switches preview off */}
      <a href={`/api/preview?exit=1&path=${encodeURIComponent(pathname)}`} className="underline text-ocean hover:text-white">
        Exit
      </a>
    </div>
  );
}
