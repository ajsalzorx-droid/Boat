"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { defaultSection, getSectionDef, type SectionData, type SectionId, type SiteContent } from "@/lib/content";
import { onPublished } from "@/lib/publish-events";

// Site text from the SEO Studio, loaded once in the root layout (server, cached until the
// next "Confirm & Publish") and read by client components with useSection("hero").
// Rendered on the server too, so Google sees it.
const ContentContext = createContext<SiteContent | null>(null);

export function ContentProvider({ content, children }: { content: SiteContent; children: ReactNode }) {
  const router = useRouter();

  // A publish in the SEO Studio (same browser): re-render this page with the new values
  useEffect(() => onPublished(() => router.refresh()), [router]);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useSection(id: SectionId): SectionData {
  const content = useContext(ContentContext);
  return content?.[id] ?? defaultSection(getSectionDef(id)!);
}
