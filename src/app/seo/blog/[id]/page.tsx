"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Heading2,
  Image as ImageIcon,
  Link2,
  Pilcrow,
  Trash2,
  X,
} from "lucide-react";
import { deleteBlogPost, getBlogPost, saveBlogPost } from "@/app/admin/actions";
import { actionFailed, uploadAdminImage } from "@/app/admin/client-helpers";
import {
  BLOG_LIMITS,
  blogTitle,
  emptyPost,
  isExternal,
  publishProblems,
  slugify,
  SLUG_RE,
  wordCount,
  type BlogBlock,
  type BlogPostInput,
} from "@/lib/blog";
import { DEFAULT_BUSINESS } from "@/lib/seo";
import { DESC_LIMIT, TITLE_LIMIT, lengthStatus } from "../../use-studio-data";
import { useStudio } from "../../studio-context";
import { AltStatus, Counter, GooglePreview, Label, Thumb, UploadButton, inputClass, siteOrigin } from "../../fields";

const card = "bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6";

const NEW_BLOCKS: Record<BlogBlock["type"], () => BlogBlock> = {
  heading: () => ({ type: "heading", text: "" }),
  paragraph: () => ({ type: "paragraph", text: "" }),
  image: () => ({ type: "image", src: "", alt: "", caption: "" }),
  link: () => ({ type: "link", label: "", url: "", nofollow: false }),
};

const BLOCK_NAMES: Record<BlogBlock["type"], string> = { heading: "Heading", paragraph: "Text", image: "Photo", link: "Link button" };

export default function BlogPostEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";
  const { data: studio } = useStudio();

  const [post, setPost] = useState<BlogPostInput | null>(isNew ? emptyPost() : null);
  const [saved, setSaved] = useState<string>(isNew ? "" : "-"); // JSON of the last saved version
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [liveSlug, setLiveSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    getBlogPost(params.id).then((res) => {
      if (actionFailed(res) || !res.ok || !res.data) return router.replace("/seo/blog");
      const p = res.data;
      const input: BlogPostInput = {
        slug: p.slug,
        title: p.title,
        seo_title: p.seo_title,
        description: p.description,
        cover_image: p.cover_image,
        cover_alt: p.cover_alt,
        blocks: p.blocks.length ? p.blocks : [NEW_BLOCKS.paragraph()],
        status: p.status,
        noindex: p.noindex,
      };
      setPost(input);
      setSaved(JSON.stringify(input));
      setPublishedAt(p.published_at);
      setLiveSlug(p.status === "published" ? p.slug : null);
    });
  }, [isNew, params.id, router]);

  const dirty = !!post && JSON.stringify(post) !== saved;

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const checks = useMemo(() => (post ? seoChecks(post) : []), [post]);

  if (!post) return <div className="h-60 flex items-center justify-center text-gray-400">Loading…</div>;

  const origin = siteOrigin(studio?.business.site_url ?? DEFAULT_BUSINESS.site_url, DEFAULT_BUSINESS.site_url);
  const set = (patch: Partial<BlogPostInput>) => setPost((p) => (p ? { ...p, ...patch } : p));
  const setBlocks = (blocks: BlogBlock[]) => set({ blocks });
  const setBlock = (i: number, b: BlogBlock) => setBlocks(post.blocks.map((x, j) => (j === i ? b : x)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...post.blocks];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setBlocks(next);
  };
  const addBlock = (type: BlogBlock["type"]) => setBlocks([...post.blocks, NEW_BLOCKS[type]()]);

  const upload = async (key: string, file: File, apply: (url: string) => void) => {
    setUploading(key);
    const url = await uploadAdminImage("blog", file);
    setUploading(null);
    if (url) apply(url);
  };

  const save = async (status: BlogPostInput["status"]) => {
    const next = { ...post, status };
    if (status === "published") {
      const problems = publishProblems(next);
      if (problems.length) return alert(`Can't publish yet:\n• ${problems.join("\n• ")}`);
      if (post.status !== "published" && !confirm("Publish this post? It goes on the website and into the sitemap for Google straight away.")) return;
    }
    if (status === "draft" && post.status === "published" && !confirm("Unpublish this post? It will be removed from the website.")) return;
    if (liveSlug && status === "published" && next.slug !== liveSlug &&
      !confirm(`Change the web address from /blog/${liveSlug} to /blog/${next.slug}? The old address will redirect to the new one.`)) return;

    setSaving(true);
    const res = await saveBlogPost(isNew ? null : params.id, next);
    setSaving(false);
    if (actionFailed(res) || !res.ok) return;
    setPost(next);
    setSaved(JSON.stringify(next));
    setLiveSlug(status === "published" ? next.slug : null);
    if (status === "published" && !publishedAt) setPublishedAt(new Date().toISOString());
    if (isNew && res.data) router.replace(`/seo/blog/${res.data.id}`);
  };

  const remove = async () => {
    if (!confirm("Delete this post for good? This can't be undone.")) return;
    const res = await deleteBlogPost(params.id);
    if (!actionFailed(res)) router.replace("/seo/blog");
  };

  const isLive = post.status === "published";

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 md:px-8 py-6 md:py-8 flex-1 space-y-6 max-w-5xl">
        <div>
          <Link href="/seo/blog" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-navy mb-3">
            <ArrowLeft size={14} /> All posts
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy">{isNew ? "New post" : post.title || "Untitled"}</h1>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isLive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {isLive ? "Published" : "Draft"}
            </span>
            {liveSlug && (
              <a href={`/blog/${liveSlug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-ocean hover:text-navy">
                View on website <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Details */}
        <section className={`${card} space-y-5`}>
          <label className="block">
            <Label hint="Shown as the big heading of the post (the page's H1).">Title</Label>
            <input
              value={post.title}
              maxLength={BLOG_LIMITS.title}
              onChange={(e) => set({ title: e.target.value, ...(!slugTouched && { slug: slugify(e.target.value) }) })}
              className={inputClass}
              placeholder="e.g. How we cook Hammour the Emirati way"
            />
          </label>

          <label className="block">
            <Label hint="Lowercase words joined by dashes. Keep it short and include the main keyword.">Web address</Label>
            <div className="flex items-center rounded-lg border border-gray-200 bg-white focus-within:border-ocean focus-within:ring-1 focus-within:ring-ocean/30">
              <span className="pl-4 text-gray-400 text-sm font-mono whitespace-nowrap">/blog/</span>
              <input
                value={post.slug}
                maxLength={BLOG_LIMITS.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") });
                }}
                onBlur={() => set({ slug: slugify(post.slug) })}
                className="flex-1 min-w-0 px-1 py-2.5 bg-transparent focus:outline-none font-mono text-sm"
              />
            </div>
            {post.slug && !SLUG_RE.test(post.slug) && <span className="text-xs text-red-500">Use lowercase letters, numbers and dashes.</span>}
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label hint="The photo at the top of the post, on /blog and when the link is shared.">Cover photo</Label>
              <div className="flex items-center gap-4">
                <Thumb src={post.cover_image} />
                <div className="flex flex-col gap-2 items-start">
                  <UploadButton
                    uploading={uploading === "cover"}
                    hasValue={!!post.cover_image}
                    onFile={(f) => upload("cover", f, (url) => set({ cover_image: url }))}
                  />
                  {post.cover_image && (
                    <button type="button" onClick={() => set({ cover_image: "", cover_alt: "" })} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            <label className="block">
              <Label hint="Describe what the cover photo shows.">Cover alt text</Label>
              <input
                value={post.cover_alt}
                maxLength={BLOG_LIMITS.alt}
                onChange={(e) => set({ cover_alt: e.target.value })}
                className={inputClass}
                disabled={!post.cover_image}
                placeholder={post.cover_image ? "e.g. Grilled hammour with lemon on a wooden board" : "Upload a cover photo first"}
              />
              {post.cover_image && (
                <span className="block mt-1">
                  <AltStatus value={post.cover_alt} />
                </span>
              )}
            </label>
          </div>
        </section>

        {/* Content */}
        <section className={`${card} space-y-4`}>
          <div>
            <h2 className="font-playfair text-lg font-bold text-navy">Content</h2>
            <p className="text-xs text-gray-400">
              Add text, headings, photos and links in reading order. Inside text, write a link as{" "}
              <code className="font-mono bg-gray-100 px-1 rounded">[link text](https://example.com)</code>. A blank line starts a new paragraph.
            </p>
          </div>

          {post.blocks.map((b, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/60">
              <div className="flex items-center justify-between mb-3 gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {i + 1}. {BLOCK_NAMES[b.type]}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp size={14} />
                  </IconBtn>
                  <IconBtn label="Move down" disabled={i === post.blocks.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown size={14} />
                  </IconBtn>
                  <IconBtn label="Remove" danger onClick={() => confirm(`Remove block ${i + 1}?`) && setBlocks(post.blocks.filter((_, j) => j !== i))}>
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              </div>
              <BlockFields
                block={b}
                uploading={uploading === `b${i}`}
                onChange={(nb) => setBlock(i, nb)}
                onUpload={(f) => upload(`b${i}`, f, (url) => setBlock(i, { ...(b as Extract<BlogBlock, { type: "image" }>), src: url }))}
              />
            </div>
          ))}

          {post.blocks.length < BLOG_LIMITS.blocks && (
            <div className="flex flex-wrap gap-2 pt-1">
              {(
                [
                  ["paragraph", Pilcrow, "Text"],
                  ["heading", Heading2, "Heading"],
                  ["image", ImageIcon, "Photo"],
                  ["link", Link2, "External link"],
                ] as const
              ).map(([type, Icon, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-ocean hover:text-navy px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  <Icon size={14} /> + {label}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Google */}
        <section className={`${card} space-y-5`}>
          <h2 className="font-playfair text-lg font-bold text-navy">Google &amp; sharing</h2>
          <label className="block">
            <Label hint={`Leave empty to use “${post.title || "Title"} | Boat Seafood Dubai”.`}>Google title (optional)</Label>
            <input value={post.seo_title} maxLength={BLOG_LIMITS.seo_title} onChange={(e) => set({ seo_title: e.target.value })} className={inputClass} />
            <Counter value={blogTitle(post)} min={TITLE_LIMIT.min} max={TITLE_LIMIT.max} />
          </label>
          <label className="block">
            <Label hint="The summary under the title in Google, and on the /blog page.">Google description</Label>
            <textarea
              value={post.description}
              maxLength={BLOG_LIMITS.description}
              onChange={(e) => set({ description: e.target.value.replace(/\n/g, " ") })}
              rows={3}
              className={`${inputClass} resize-y`}
            />
            <Counter value={post.description} min={DESC_LIMIT.min} max={DESC_LIMIT.max} />
          </label>
          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input type="checkbox" checked={post.noindex} onChange={(e) => set({ noindex: e.target.checked })} className="mt-1" />
            <span>
              Hide from Google <span className="text-gray-400">(the post stays on the website but is not indexed or listed in the sitemap)</span>
            </span>
          </label>
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Google preview</div>
            <GooglePreview
              siteName={studio?.business.name ?? DEFAULT_BUSINESS.name}
              origin={origin}
              path={`/blog/${post.slug || "…"}`}
              title={blogTitle(post)}
              description={post.description}
            />
          </div>
        </section>

        {/* SEO checklist */}
        <section className={card}>
          <h2 className="font-playfair text-lg font-bold text-navy mb-3">SEO check</h2>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className={`${c.required ? "text-red-500" : "text-amber-500"} shrink-0 mt-0.5`} />
                )}
                <span className={c.ok ? "text-gray-600" : "text-gray-800"}>
                  {c.label}
                  {!c.ok && c.required && <span className="text-red-500 text-xs"> · needed to publish</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {!isNew && (
          <button type="button" onClick={remove} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-700">
            <Trash2 size={14} /> Delete post
          </button>
        )}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 md:px-8 py-3 flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-gray-500 mr-auto">
          {dirty ? "Unsaved changes" : isLive ? "Live on the website" : isNew ? "Not saved yet" : "Saved as draft (not on the website)"}
        </span>
        {isLive ? (
          <button type="button" onClick={() => save("draft")} disabled={saving} className="px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 disabled:opacity-40">
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={saving || (!dirty && !isNew)}
            className="px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider border border-gray-200 text-navy hover:bg-gray-50 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
        )}
        <button
          type="button"
          onClick={() => save("published")}
          disabled={saving || (isLive && !dirty)}
          className="bg-navy hover:bg-navy/90 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-40"
        >
          {saving ? "Saving…" : isLive ? "Update live post" : "Publish"}
        </button>
      </div>
    </div>
  );
}

function BlockFields({
  block: b,
  uploading,
  onChange,
  onUpload,
}: {
  block: BlogBlock;
  uploading: boolean;
  onChange: (b: BlogBlock) => void;
  onUpload: (f: File) => void;
}) {
  if (b.type === "heading")
    return (
      <input
        value={b.text}
        maxLength={BLOG_LIMITS.heading}
        onChange={(e) => onChange({ ...b, text: e.target.value })}
        className={`${inputClass} font-playfair text-lg font-bold`}
        placeholder="Section heading (shown as H2)"
      />
    );
  if (b.type === "paragraph")
    return (
      <textarea
        value={b.text}
        maxLength={BLOG_LIMITS.paragraph}
        onChange={(e) => onChange({ ...b, text: e.target.value })}
        rows={6}
        className={`${inputClass} resize-y leading-relaxed`}
        placeholder="Write here…"
      />
    );
  if (b.type === "image")
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Thumb src={b.src} />
          <UploadButton uploading={uploading} hasValue={!!b.src} onFile={onUpload} />
        </div>
        <label className="block">
          <Label hint="Describe the photo for Google and screen readers.">Alt text</Label>
          <input value={b.alt} maxLength={BLOG_LIMITS.alt} onChange={(e) => onChange({ ...b, alt: e.target.value })} className={inputClass} />
          {b.src && (
            <span className="block mt-1">
              <AltStatus value={b.alt} />
            </span>
          )}
        </label>
        <label className="block">
          <Label>Caption (optional, shown under the photo)</Label>
          <input value={b.caption} maxLength={BLOG_LIMITS.caption} onChange={(e) => onChange({ ...b, caption: e.target.value })} className={inputClass} />
        </label>
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <Label>Link text</Label>
          <input value={b.label} maxLength={BLOG_LIMITS.label} onChange={(e) => onChange({ ...b, label: e.target.value })} className={inputClass} placeholder="e.g. Visit Waterfront Market" />
        </label>
        <label className="block">
          <Label>Link address</Label>
          <input value={b.url} maxLength={BLOG_LIMITS.url} onChange={(e) => onChange({ ...b, url: e.target.value.trim() })} className={inputClass} placeholder="https://…" />
          {b.url && !/^(https?:\/\/|\/|mailto:|tel:)/.test(b.url) && <span className="text-xs text-red-500">Start with https:// (or / for a page on this site)</span>}
        </label>
      </div>
      {isExternal(b.url) && (
        <label className="flex items-start gap-2 text-xs text-gray-500">
          <input type="checkbox" checked={b.nofollow} onChange={(e) => onChange({ ...b, nofollow: e.target.checked })} className="mt-0.5" />
          <span>Sponsored / don&apos;t vouch for this site (adds rel=&quot;nofollow sponsored&quot;)</span>
        </label>
      )}
    </div>
  );
}

function IconBtn({ label, disabled, danger, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded text-gray-400 disabled:opacity-30 ${danger ? "hover:text-red-500 hover:bg-red-50" : "hover:text-navy hover:bg-gray-100"}`}
    >
      {children}
    </button>
  );
}

function seoChecks(p: BlogPostInput) {
  const words = wordCount(p.blocks);
  const images = p.blocks.filter((b): b is Extract<BlogBlock, { type: "image" }> => b.type === "image" && !!b.src);
  const links = p.blocks.flatMap((b) =>
    b.type === "link" ? [b.url] : b.type === "paragraph" ? [...b.text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]) : []
  );
  const title = blogTitle(p);
  return [
    { label: "Title added", ok: !!p.title.trim(), required: true },
    { label: "Web address set", ok: SLUG_RE.test(p.slug), required: true },
    { label: `Google title ${title.trim().length} characters (best ${TITLE_LIMIT.min}–${TITLE_LIMIT.max})`, ok: lengthStatus(title, TITLE_LIMIT) === "good" },
    { label: `Google description ${p.description.trim().length} characters (best ${DESC_LIMIT.min}–${DESC_LIMIT.max})`, ok: lengthStatus(p.description, DESC_LIMIT) === "good", required: !p.description.trim() },
    { label: "Cover photo (used when the link is shared)", ok: !!p.cover_image },
    { label: "Every photo has alt text", ok: (!p.cover_image || !!p.cover_alt.trim()) && images.every((b) => b.alt.trim()), required: true },
    { label: `${words} words (aim for 300 or more)`, ok: words >= 300 },
    { label: "At least one heading to split the text", ok: p.blocks.some((b) => b.type === "heading" && b.text.trim()) },
    { label: "Links to a page on this site (e.g. /menu or /book)", ok: links.some((u) => u.startsWith("/")) },
    { label: `${links.filter(isExternal).length} external link(s)`, ok: true },
  ];
}
