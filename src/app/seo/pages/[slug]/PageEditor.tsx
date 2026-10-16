"use client";

import { useState } from "react";
import { ExternalLink, Eye, EyeOff, RotateCcw, Search, Monitor, Smartphone } from "lucide-react";
import { saveContentSection, resetContentSection, saveSeoPage } from "@/app/admin/actions";
import { actionFailed, uploadAdminImage } from "@/app/admin/client-helpers";
import { defaultSection, STUDIO_PAGES, type SectionDef, type StudioPageSlug } from "@/lib/content";
import { DEFAULT_BUSINESS } from "@/lib/seo";
import { DESC_LIMIT, TITLE_LIMIT, sectionsFor } from "../../use-studio-data";
import { useStudio } from "../../studio-context";
import {
  Counter,
  FieldInput,
  GooglePreview,
  Label,
  ListEditor,
  MissingTablesNotice,
  SaveButton,
  SharePreview,
  ShareImageInput,
  inputClass,
  siteOrigin,
} from "../../fields";

const SEO_ANCHOR = "seo-settings";

export default function PageEditor({ slug }: { slug: StudioPageSlug }) {
  const page = STUDIO_PAGES.find((p) => p.slug === slug)!;
  const sections = sectionsFor(slug);
  const studio = useStudio();
  const { data } = studio;

  const [saving, setSaving] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<Set<string>>(new Set());
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<"off" | "mobile" | "desktop">("mobile");
  const [previewVersion, setPreviewVersion] = useState(0);

  if (!data) return <div className="h-60 flex items-center justify-center text-gray-400">Loading…</div>;

  const seoPath = page.seoPath;
  const seo = seoPath ? data.seoPages[seoPath] : null;
  const origin = siteOrigin(data.business.site_url, DEFAULT_BUSINESS.site_url);
  const dirtySections = sections.filter((s) => studio.isSectionDirty(s.id));
  const seoDirty = !!seoPath && studio.isSeoDirty(seoPath);
  const dirtyCount = dirtySections.length + (seoDirty ? 1 : 0);

  const markJustSaved = (id: string) => setJustSaved((prev) => new Set(prev).add(id));
  const refreshPreview = () => setPreviewVersion((v) => v + 1);

  const upload = async (key: string, file: File, apply: (url: string) => void) => {
    setUploadingKey(key);
    const url = await uploadAdminImage("content", file);
    setUploadingKey(null);
    if (url) apply(url);
  };

  const saveSection = async (def: SectionDef) => {
    setSaving(def.id);
    const res = await saveContentSection(def.id, data.content[def.id as keyof typeof data.content]);
    setSaving(null);
    if (actionFailed(res)) return false;
    studio.markSectionSaved(def.id);
    markJustSaved(def.id);
    return true;
  };

  const saveSeo = async () => {
    if (!seoPath || !seo) return false;
    setSaving(SEO_ANCHOR);
    const res = await saveSeoPage(seoPath, seo);
    setSaving(null);
    if (actionFailed(res)) return false;
    studio.markSeoSaved(seoPath);
    markJustSaved(SEO_ANCHOR);
    return true;
  };

  const saveAll = async () => {
    if (seoDirty && !(await saveSeo())) return;
    for (const def of dirtySections) if (!(await saveSection(def))) return;
  };

  const resetSection = async (def: SectionDef) => {
    if (!confirm(`Put "${def.label}" back to the original text? Changes in this section will be lost.`)) return;
    setSaving(def.id);
    const res = await resetContentSection(def.id);
    setSaving(null);
    if (actionFailed(res)) return;
    studio.markSectionReset(def.id, defaultSection(def));
  };

  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-200 px-4 md:px-8 pt-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] tracking-[3px] uppercase text-gray-400 font-bold">Page</div>
            <h1 className="text-2xl font-playfair font-bold text-navy leading-tight">{page.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex rounded-lg border border-gray-200 bg-white overflow-hidden">
              {(
                [
                  ["mobile", Smartphone, "Mobile preview"],
                  ["desktop", Monitor, "Desktop preview"],
                  ["off", EyeOff, "Hide preview"],
                ] as const
              ).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => setPreview(mode)}
                  className={`px-3 py-2 ${preview === mode ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
            <a
              href={page.href}
              target="_blank"
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              Open page <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Jump to section */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {seoPath && (
            <JumpChip dirty={seoDirty} onClick={() => jumpTo(SEO_ANCHOR)}>
              <Search size={12} /> Google &amp; sharing
            </JumpChip>
          )}
          {sections.map((s) => (
            <JumpChip key={s.id} dirty={studio.isSectionDirty(s.id)} onClick={() => jumpTo(`section-${s.id}`)}>
              {s.label}
            </JumpChip>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 md:px-8 py-6">
        {data.missingTables && (
          <div className="mb-6">
            <MissingTablesNotice />
          </div>
        )}

        <div className={`grid gap-6 ${preview !== "off" ? "xl:grid-cols-[minmax(0,1fr)_auto]" : ""}`}>
          <div className="space-y-6 min-w-0 max-w-4xl">
            {slug === "site" && (
              <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-xl p-4">
                The header and footer appear on every page. Changes here show everywhere on the site.
              </p>
            )}

            {/* Google & sharing */}
            {seoPath && seo && (
              <Card id={SEO_ANCHOR} title="Google & sharing" dirty={seoDirty}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <label className="block">
                      <Label hint="The blue link on Google and the browser tab.">Page title</Label>
                      <input
                        value={seo.title}
                        maxLength={120}
                        onChange={(e) => studio.setSeoPage(seoPath, { ...seo, title: e.target.value })}
                        className={inputClass}
                      />
                      <Counter value={seo.title} {...TITLE_LIMIT} />
                    </label>
                    <label className="block">
                      <Label hint="The grey text under the link on Google.">Meta description</Label>
                      <textarea
                        value={seo.description}
                        maxLength={320}
                        rows={4}
                        onChange={(e) => studio.setSeoPage(seoPath, { ...seo, description: e.target.value })}
                        className={`${inputClass} resize-none`}
                      />
                      <Counter value={seo.description} {...DESC_LIMIT} />
                    </label>
                    <div>
                      <Label hint="Shown on WhatsApp, Facebook and X. Best size 1200 × 630.">Share image</Label>
                      <ShareImageInput
                        value={seo.og_image}
                        fallback={data.business.default_og_image}
                        uploading={uploadingKey === SEO_ANCHOR}
                        onFile={async (file) => {
                          setUploadingKey(SEO_ANCHOR);
                          const url = await uploadAdminImage("seo", file);
                          setUploadingKey(null);
                          if (url) studio.setSeoPage(seoPath, { ...seo, og_image: url });
                        }}
                        onClear={() => studio.setSeoPage(seoPath, { ...seo, og_image: "" })}
                      />
                    </div>
                    <label className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seo.noindex}
                        onChange={(e) => studio.setSeoPage(seoPath, { ...seo, noindex: e.target.checked })}
                        className="mt-1 w-4 h-4 accent-navy"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-navy">Hide this page from Google</span>
                        <span className="block text-xs text-gray-500">Removes it from search results and the sitemap.</span>
                      </span>
                    </label>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <PreviewLabel>Google preview</PreviewLabel>
                      {seo.noindex ? (
                        <p className="text-sm text-gray-400 italic">Hidden from Google.</p>
                      ) : (
                        <GooglePreview
                          siteName={data.business.name}
                          origin={origin}
                          path={seoPath}
                          title={seo.title}
                          description={seo.description}
                        />
                      )}
                    </div>
                    <div>
                      <PreviewLabel>WhatsApp / Facebook preview</PreviewLabel>
                      <SharePreview
                        origin={origin}
                        image={seo.og_image || data.business.default_og_image}
                        title={seo.title}
                        description={seo.description}
                      />
                    </div>
                  </div>
                </div>
                <CardFooter>
                  <span />
                  <SaveButton
                    saving={saving === SEO_ANCHOR}
                    saved={justSaved.has(SEO_ANCHOR)}
                    dirty={seoDirty}
                    onClick={async () => {
                      await saveSeo();
                    }}
                  />
                </CardFooter>
              </Card>
            )}

            {/* Page sections, in the order they appear on the page */}
            {sections.map((def, index) => {
              const value = data.content[def.id as keyof typeof data.content];
              const dirty = studio.isSectionDirty(def.id);
              return (
                <Card
                  key={def.id}
                  id={`section-${def.id}`}
                  title={def.label}
                  step={index + 1}
                  dirty={dirty}
                  edited={data.customised.has(def.id)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {def.fields.map((f) => (
                      <div key={f.key} className={f.type === "text" || f.type === "link" ? "" : "md:col-span-2"}>
                        <FieldInput
                          field={f}
                          value={value.fields[f.key] ?? ""}
                          imageSrc={f.image ? value.fields[f.image] : undefined}
                          uploading={uploadingKey === `${def.id}.${f.key}`}
                          onChange={(v) => studio.setSection(def.id, { ...value, fields: { ...value.fields, [f.key]: v } })}
                          onUpload={(file) =>
                            upload(`${def.id}.${f.key}`, file, (url) =>
                              studio.setSection(def.id, { ...value, fields: { ...value.fields, [f.key]: url } })
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {def.list && (
                    <div className={def.fields.length ? "mt-6 pt-6 border-t border-gray-100" : ""}>
                      <ListEditor
                        def={def}
                        items={value.items}
                        uploadingKey={uploadingKey}
                        onChange={(items) => studio.setSection(def.id, { ...value, items })}
                        onUpload={upload}
                      />
                    </div>
                  )}

                  <CardFooter>
                    <button
                      type="button"
                      onClick={() => resetSection(def)}
                      disabled={!data.customised.has(def.id) || saving === def.id}
                      className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-red-500 disabled:opacity-40 disabled:hover:text-gray-400"
                    >
                      <RotateCcw size={14} /> Reset to original
                    </button>
                    <SaveButton
                      saving={saving === def.id}
                      saved={justSaved.has(def.id)}
                      dirty={dirty}
                      label="Save section"
                      onClick={async () => {
                        await saveSection(def);
                      }}
                    />
                  </CardFooter>
                </Card>
              );
            })}

            <p className="text-xs text-gray-400 pb-20">
              An empty field shows the original text. Dish names, prices and photos on the menu are managed by the
              restaurant in Admin → Menu.
            </p>
          </div>

          {/* Live preview (desktop screens) */}
          {preview !== "off" && (
            <div className="hidden xl:block">
              <div className="sticky top-36">
                <div className="flex items-center justify-between mb-2">
                  <PreviewLabel>
                    <Eye size={12} className="inline -mt-0.5 mr-1" /> Live website (published)
                  </PreviewLabel>
                  <button type="button" onClick={refreshPreview} className="text-xs text-ocean hover:text-navy font-semibold">
                    Reload
                  </button>
                </div>
                <div
                  className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden ${
                    preview === "mobile" ? "w-[390px] h-[calc(100dvh-14rem)]" : "w-[640px] h-[calc(100dvh-14rem)]"
                  }`}
                >
                  {preview === "mobile" ? (
                    <iframe key={`${previewVersion}-${studio.publishedVersion}`} src={page.href} title={`${page.name} preview`} className="w-full h-full" />
                  ) : (
                    // Desktop layout at 1280px wide, scaled down to fit the column
                    <div className="w-[1280px] h-[200%] origin-top-left scale-50">
                      <iframe key={`${previewVersion}-${studio.publishedVersion}`} src={page.href} title={`${page.name} preview`} className="w-full h-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved changes bar */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-0 z-20 bg-navy text-white px-4 md:px-8 py-3 flex items-center justify-between gap-4 shadow-2xl">
          <span className="text-sm">
            {dirtyCount} {dirtyCount === 1 ? "section has" : "sections have"} unsaved changes · saving keeps them as a draft until you Confirm &amp; Publish
          </span>
          <button
            type="button"
            onClick={saveAll}
            disabled={!!saving}
            className="bg-ocean text-navy hover:bg-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save drafts"}
          </button>
        </div>
      )}
    </div>
  );
}

function Card({
  id,
  title,
  step,
  dirty,
  edited,
  children,
}: {
  id: string;
  title: string;
  step?: number;
  dirty?: boolean;
  edited?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-40 bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        {step !== undefined && (
          <span className="w-7 h-7 rounded-full bg-navy/5 text-navy text-xs font-bold flex items-center justify-center shrink-0">
            {step}
          </span>
        )}
        <h2 className="font-playfair text-lg font-bold text-navy">{title}</h2>
        {dirty ? (
          <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            Unsaved
          </span>
        ) : (
          edited && (
            <span className="text-[10px] uppercase tracking-wider font-bold text-ocean bg-ocean/10 px-2 py-0.5 rounded">Edited</span>
          )
        )}
      </div>
      {children}
    </section>
  );
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between mt-6 pt-5 border-t border-gray-100">
      {children}
    </div>
  );
}

function JumpChip({ dirty, onClick, children }: { dirty: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 flex items-center gap-1.5 bg-white border border-gray-200 hover:border-navy/30 text-navy text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
    >
      {children}
      {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-label="unsaved" />}
    </button>
  );
}

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] tracking-[3px] uppercase font-bold text-gray-400 mb-3">{children}</div>;
}
