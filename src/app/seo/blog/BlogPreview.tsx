"use client";

import { useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import BlogContent from "@/components/BlogContent";
import { readingMinutes, type BlogPostInput } from "@/lib/blog";

// SEO Studio -> Blog -> Preview: the post as it will look on /blog/<slug>, drafts and unsaved
// edits included. Same markup and the same BlogContent component as the public page
// (src/app/blog/[slug]/page.tsx), shown only inside the studio, so nothing here reaches Google.

const dateText = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" });

export default function BlogPreview({ post, publishedAt, onClose }: { post: BlogPostInput; publishedAt: string | null; onClose: () => void }) {
  // Close with Esc; stop the editor behind from scrolling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const isLive = post.status === "published";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream" role="dialog" aria-modal="true" aria-label="Post preview">
      <div className="flex items-center justify-between gap-3 bg-white border-b border-gray-200 px-4 md:px-8 py-3 shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] tracking-[3px] uppercase text-gray-400 font-bold">
            Preview · {isLive ? "Published" : "Draft (not on the website)"}
          </div>
          <div className="text-xs text-gray-500 font-mono truncate">/blog/{post.slug || "…"}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 bg-navy hover:bg-navy/90 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0"
        >
          <X size={14} /> Close preview
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <header className="relative pt-16 md:pt-24 pb-16 px-8 md:px-20 bg-navy text-white">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 inline-flex items-center gap-2 text-[10px] tracking-[4px] uppercase text-ocean font-bold">
              <ArrowLeft size={14} aria-hidden /> Blog
            </div>
            <h1 className="font-playfair text-[clamp(34px,5vw,64px)] font-bold leading-[1.05] mb-6">
              {post.title || <span className="text-white/30">Untitled</span>}
            </h1>
            <div className="text-[11px] tracking-[3px] uppercase text-white/50">
              {dateText(publishedAt ?? new Date().toISOString())} · {readingMinutes(post.blocks)} min read
            </div>
          </div>
        </header>

        <article className="px-6 md:px-20 py-16">
          <div className="max-w-3xl mx-auto">
            {post.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.cover_image} alt={post.cover_alt} decoding="async" className="w-full h-auto mb-12 -mt-28 md:-mt-32 relative shadow-xl" />
            )}
            <BlogContent blocks={post.blocks} />
            {!post.blocks.some((b) => (b.type === "paragraph" && b.text.trim()) || (b.type === "heading" && b.text.trim()) || (b.type === "image" && b.src)) && (
              <p className="text-navy/40 text-center py-10">No content yet. Add text, headings or photos in the editor.</p>
            )}
            <div className="mt-16 pt-10 border-t border-navy/10 flex flex-wrap gap-4">
              <span className="bg-navy text-cream px-6 py-3.5 text-[11px] tracking-[3px] uppercase font-bold">Book a table</span>
              <span className="border border-navy/20 text-navy px-6 py-3.5 text-[11px] tracking-[3px] uppercase font-bold">See the menu</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
