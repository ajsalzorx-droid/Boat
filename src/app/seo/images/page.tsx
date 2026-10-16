"use client";

import { useState } from "react";
import Link from "next/link";
import { saveContentSection } from "@/app/admin/actions";
import { actionFailed } from "@/app/admin/client-helpers";
import { STUDIO_PAGES, type SectionData, type SiteContent } from "@/lib/content";
import { collectAltRefs, type AltRef } from "../use-studio-data";
import { useStudio } from "../studio-context";
import { AltStatus, MissingTablesNotice, Thumb, inputClass } from "../fields";

// "missing" keeps the list it started with, so a row does not vanish while typing
type Filter = "all" | "missing";

const isWeak = (ref: AltRef) => ref.value.trim().length < 10;

export default function StudioImagesPage() {
  const studio = useStudio();
  const { data } = studio;
  const [filter, setFilter] = useState<Filter>("all");
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  if (!data) return <div className="h-60 flex items-center justify-center text-gray-400">Loading…</div>;

  const refs = collectAltRefs(data.content);
  const weak = refs.filter(isWeak).length;
  const shown = filter === "missing" ? refs.filter((r) => missingKeys.has(r.key)) : refs;
  const dirtyIds = [...new Set(refs.map((r) => r.sectionId))].filter((id) => studio.isSectionDirty(id));

  const setAlt = (ref: AltRef, value: string) => {
    setSavedCount(null);
    const section = data.content[ref.sectionId as keyof SiteContent];
    const next: SectionData =
      ref.item === null
        ? { ...section, fields: { ...section.fields, [ref.altKey]: value } }
        : { ...section, items: section.items.map((it, i) => (i === ref.item ? { ...it, [ref.altKey]: value } : it)) };
    studio.setSection(ref.sectionId, next);
  };

  const saveAll = async () => {
    setSaving(true);
    let done = 0;
    for (const id of dirtyIds) {
      const res = await saveContentSection(id, data.content[id as keyof SiteContent]);
      if (actionFailed(res)) break;
      studio.markSectionSaved(id);
      done++;
    }
    setSaving(false);
    setSavedCount(done);
  };

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 md:px-8 py-6 md:py-8 flex-1 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1">Images &amp; Alt Text</h1>
          <p className="text-sm md:text-base text-gray-500">
            Alt text tells Google (and screen readers) what each photo shows. Describe the photo in a few words and
            include the dish or place where it fits naturally.
          </p>
        </div>

        {data.missingTables && <MissingTablesNotice />}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden text-sm">
            {(
              [
                ["all", `All images (${refs.length})`],
                ["missing", `Missing or too short (${weak})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFilter(id);
                  if (id === "missing") setMissingKeys(new Set(refs.filter(isWeak).map((r) => r.key)));
                }}
                className={`px-4 py-2 font-semibold ${filter === id ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {savedCount !== null && dirtyIds.length === 0 && (
            <span className="text-sm text-green-600 font-semibold">Saved – publish to go live</span>
          )}
        </div>

        {STUDIO_PAGES.map((page) => {
          const pageRefs = shown.filter((r) => r.page === page.slug);
          if (!pageRefs.length) return null;
          return (
            <div key={page.slug} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
                <h2 className="font-playfair text-lg font-bold text-navy">{page.name}</h2>
                <Link href={`/seo/pages/${page.slug}`} className="text-xs font-bold uppercase tracking-wider text-ocean hover:text-navy">
                  Edit page
                </Link>
              </div>
              <ul className="divide-y divide-gray-100">
                {pageRefs.map((ref) => (
                  <li key={ref.key} className="flex flex-col sm:flex-row gap-4 px-4 md:px-6 py-4">
                    <Thumb src={ref.src} className="w-full sm:w-32 h-40 sm:h-20" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-500 mb-1.5">{ref.label}</div>
                      <input
                        value={ref.value}
                        placeholder={ref.fallback || "Describe this photo"}
                        onChange={(e) => setAlt(ref, e.target.value)}
                        className={inputClass}
                        aria-label={`Alt text for ${ref.label}`}
                      />
                      <div className="mt-1">
                        <AltStatus value={ref.value} fallback={ref.fallback} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <p className="text-xs text-gray-400 pb-20">
          Photos of dishes and the daily catch use the dish name as alt text. Those are managed in Admin → Menu and
          Admin → Daily Catch.
        </p>
      </div>

      {dirtyIds.length > 0 && (
        <div className="sticky bottom-0 z-20 bg-navy text-white px-4 md:px-8 py-3 flex items-center justify-between gap-4 shadow-2xl">
          <span className="text-sm">Unsaved alt text changes</span>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="bg-ocean text-navy hover:bg-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save drafts"}
          </button>
        </div>
      )}
    </div>
  );
}
