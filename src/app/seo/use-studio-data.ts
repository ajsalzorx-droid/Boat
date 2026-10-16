"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ALL_SECTIONS, mergeAll, type SectionData, type SiteContent } from "@/lib/content";
import { DEFAULT_BUSINESS, SEO_PAGES, type BusinessInfo, type SeoPage } from "@/lib/seo";

export type SeoForm = Omit<SeoPage, "path" | "updated_at">;

export function defaultSeoPages(): Record<string, SeoForm> {
  return Object.fromEntries(
    SEO_PAGES.map((p) => [p.path, { title: p.title, description: p.description, og_image: "", noindex: false }])
  );
}

export type StudioData = {
  seoPages: Record<string, SeoForm>;
  business: BusinessInfo;
  content: SiteContent;
  // Section ids saved at least once (shown as "Edited", can be reset)
  customised: Set<string>;
  // Saved (draft) changes that "Confirm & Publish" has not pushed to the site yet
  pendingPublish: boolean;
  publishedAt: string | null;
  missingTables: boolean;
};

// Everything the studio edits, read straight from the database with the signed-in session
// (never from the site cache), so it always shows the latest saved values
export async function fetchStudioData(): Promise<StudioData> {
  const [seoRes, businessRes, contentRes, publishRes] = await Promise.all([
    supabase.from("seo_pages").select("*"),
    supabase.from("business_info").select("*").eq("id", 1).maybeSingle(),
    supabase.from("site_content").select("section, data"),
    supabase.from("site_publish").select("changed_at, published_at").eq("id", 1).maybeSingle(),
  ]);
  const changedAt: string | null = publishRes.data?.changed_at ?? null;
  const publishedAt: string | null = publishRes.data?.published_at ?? null;

  const seoPages = defaultSeoPages();
  for (const row of (seoRes.data ?? []) as SeoPage[]) {
    if (!seoPages[row.path]) continue;
    seoPages[row.path] = {
      title: row.title || seoPages[row.path].title,
      description: row.description || seoPages[row.path].description,
      og_image: row.og_image || "",
      noindex: !!row.noindex,
    };
  }

  const business = { ...DEFAULT_BUSINESS };
  for (const key of Object.keys(DEFAULT_BUSINESS) as (keyof BusinessInfo)[]) {
    if (typeof businessRes.data?.[key] === "string") business[key] = businessRes.data[key];
  }

  const rows = (contentRes.data ?? []) as { section: string; data: SectionData }[];
  return {
    seoPages,
    business,
    content: mergeAll(rows),
    customised: new Set(rows.map((r) => r.section)),
    pendingPublish: !!changedAt && (!publishedAt || new Date(changedAt) > new Date(publishedAt)),
    publishedAt,
    missingTables: !!(seoRes.error || businessRes.error || contentRes.error || publishRes.error),
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type State = { current: StudioData; saved: StudioData };

// Studio state: `current` is what the user is editing, `saved` what is in the database.
// Used once by StudioProvider (studio-context.tsx); pages read it with useStudio().
export function useStudioData() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    fetchStudioData().then((d) => setState({ current: d, saved: structuredClone(d) }));
  }, []);

  const patch = (fn: (s: State) => void) =>
    setState((prev) => {
      if (!prev) return prev;
      const next = { current: { ...prev.current }, saved: { ...prev.saved } };
      fn(next);
      return next;
    });

  // A save stored a draft in the database: the site is now behind until "Confirm & Publish"
  const draftSaved = (s: State) => {
    s.current.pendingPublish = true;
  };

  const isSectionDirty = (id: string) =>
    !!state && !same(state.current.content[id as keyof SiteContent], state.saved.content[id as keyof SiteContent]);
  const isSeoDirty = (path: string) => !!state && !same(state.current.seoPages[path], state.saved.seoPages[path]);
  const isBusinessDirty = () => !!state && !same(state.current.business, state.saved.business);

  return {
    data: state?.current ?? null,
    isSectionDirty,
    isSeoDirty,
    isBusinessDirty,
    // Edits not saved to the database yet
    unsaved: () => ({
      sections: ALL_SECTIONS.map((s) => s.id).filter(isSectionDirty),
      seoPaths: SEO_PAGES.map((p) => p.path as string).filter(isSeoDirty),
      business: isBusinessDirty(),
    }),

    // Fetch the latest values from the database (drops unsaved edits)
    reload: async () => {
      const d = await fetchStudioData();
      setState({ current: d, saved: structuredClone(d) });
      return d;
    },

    setSection: (id: string, value: SectionData) =>
      patch((s) => {
        s.current.content = { ...s.current.content, [id]: value };
      }),
    setSeoPage: (path: string, value: SeoForm) =>
      patch((s) => {
        s.current.seoPages = { ...s.current.seoPages, [path]: value };
      }),
    setBusiness: (value: BusinessInfo) =>
      patch((s) => {
        s.current.business = value;
      }),

    markSectionSaved: (id: string) =>
      patch((s) => {
        s.saved.content = { ...s.saved.content, [id]: s.current.content[id as keyof SiteContent] };
        s.current.customised = new Set(s.current.customised).add(id);
        draftSaved(s);
      }),
    markSectionReset: (id: string, value: SectionData) =>
      patch((s) => {
        s.current.content = { ...s.current.content, [id]: value };
        s.saved.content = { ...s.saved.content, [id]: value };
        const customised = new Set(s.current.customised);
        customised.delete(id);
        s.current.customised = customised;
        draftSaved(s);
      }),
    markSeoSaved: (path: string) =>
      patch((s) => {
        s.saved.seoPages = { ...s.saved.seoPages, [path]: s.current.seoPages[path] };
        draftSaved(s);
      }),
    markBusinessSaved: () =>
      patch((s) => {
        s.saved.business = s.current.business;
        draftSaved(s);
      }),
  };
}

export type Studio = ReturnType<typeof useStudioData>;

export const sectionsFor = (slug: string) => ALL_SECTIONS.filter((s) => s.page === slug);

// One editable alt text on the site (a section field, or a field of one list item)
export type AltRef = {
  key: string; // unique id for React
  sectionId: string;
  page: string;
  label: string;
  item: number | null;
  altKey: string;
  src: string;
  value: string;
  // What the site shows when the alt is empty (list items fall back to their title)
  fallback: string;
};

export function collectAltRefs(content: SiteContent): AltRef[] {
  const refs: AltRef[] = [];
  for (const def of ALL_SECTIONS) {
    const data = content[def.id as keyof SiteContent];
    for (const f of def.fields) {
      if (f.type !== "alt") continue;
      refs.push({
        key: `${def.id}.${f.key}`,
        sectionId: def.id,
        page: def.page,
        label: `${def.label} – ${f.label.replace(/ – alt text$/, "")}`,
        item: null,
        altKey: f.key,
        src: f.src ?? (f.image ? data.fields[f.image] : "") ?? "",
        value: data.fields[f.key] ?? "",
        fallback: "",
      });
    }
    const altField = def.list?.fields.find((f) => f.type === "alt");
    if (!def.list || !altField) continue;
    data.items.forEach((item, i) => {
      refs.push({
        key: `${def.id}.${i}.${altField.key}`,
        sectionId: def.id,
        page: def.page,
        label: `${def.label} – ${def.list!.itemLabel} ${i + 1}${item.title ? ` (${item.title})` : ""}`,
        item: i,
        altKey: altField.key,
        src: altField.image ? item[altField.image] ?? "" : "",
        value: item[altField.key] ?? "",
        fallback: item.title ?? "",
      });
    });
  }
  return refs;
}

// Google cuts titles/descriptions at roughly these lengths
export const TITLE_LIMIT = { min: 30, max: 60 };
export const DESC_LIMIT = { min: 70, max: 160 };

export function lengthStatus(value: string, { min, max }: { min: number; max: number }) {
  const n = value.trim().length;
  if (n === 0) return "empty" as const;
  if (n > max) return "long" as const;
  if (n < min) return "short" as const;
  return "good" as const;
}
