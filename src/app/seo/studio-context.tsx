"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { publishSite, saveBusinessInfo, saveContentSection, saveSeoPage } from "@/app/admin/actions";
import { actionFailed } from "@/app/admin/client-helpers";
import type { SiteContent } from "@/lib/content";
import { emitPublished, onPublished } from "@/lib/publish-events";
import { useStudioData, type Studio } from "./use-studio-data";

type StudioContextValue = Studio & {
  publishing: boolean;
  // Bumps after every publish (here or in another tab): previews use it to reload
  publishedVersion: number;
  publish: () => Promise<boolean>;
};

const StudioContext = createContext<StudioContextValue | null>(null);

// One studio state for every studio page, so edits survive moving between pages and the
// Confirm & Publish button in the layout sees all of them.
export function StudioProvider({ children }: { children: ReactNode }) {
  const studio = useStudioData();
  const [publishing, setPublishing] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState(0);

  // Latest studio for the event listener below (it subscribes once)
  const studioRef = useRef(studio);
  useEffect(() => {
    studioRef.current = studio;
  });

  // Another studio tab published: fetch the latest values unless this tab has unsaved edits
  useEffect(
    () =>
      onPublished(
        () => {
          const current = studioRef.current;
          const u = current.unsaved();
          if (!u.sections.length && !u.seoPaths.length && !u.business) current.reload();
          setPublishedVersion((v) => v + 1);
        },
        { ignoreOwnTab: true }
      ),
    []
  );

  // Confirm & Publish: save every unsaved edit, expire the site cache, then fetch the
  // latest values from the database and tell other open tabs
  const publish = async () => {
    const data = studio.data;
    if (!data) return false;
    setPublishing(true);
    try {
      const u = studio.unsaved();
      for (const path of u.seoPaths) {
        if (actionFailed(await saveSeoPage(path, data.seoPages[path]))) return false;
        studio.markSeoSaved(path);
      }
      if (u.business) {
        if (actionFailed(await saveBusinessInfo(data.business))) return false;
        studio.markBusinessSaved();
      }
      for (const id of u.sections) {
        if (actionFailed(await saveContentSection(id, data.content[id as keyof SiteContent]))) return false;
        studio.markSectionSaved(id);
      }

      if (actionFailed(await publishSite())) return false;
      await studio.reload();
      setPublishedVersion((v) => v + 1);
      emitPublished();
      return true;
    } finally {
      setPublishing(false);
    }
  };

  return (
    <StudioContext.Provider value={{ ...studio, publishing, publishedVersion, publish }}>{children}</StudioContext.Provider>
  );
}

export function useStudio() {
  const value = useContext(StudioContext);
  if (!value) throw new Error("useStudio must be used inside StudioProvider (src/app/seo/layout.tsx)");
  return value;
}
