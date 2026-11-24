"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import BlogArticle from "@/components/BlogArticle";
import { readingMinutes, type BlogPostInput } from "@/lib/blog";

// SEO Studio -> Blog -> Preview: the post as it will look on /blog/<slug>, drafts and unsaved
// edits included. The same BlogArticle component as the public page
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
        <BlogArticle post={post} date={dateText(publishedAt ?? new Date().toISOString())} readTime={`${readingMinutes(post.blocks)} min read`} preview />
      </div>
    </div>
  );
}
