"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Plus } from "lucide-react";
import { listBlogPosts } from "@/app/admin/actions";
import { actionFailed } from "@/app/admin/client-helpers";
import { blogTitle, publishProblems, wordCount, type BlogPost } from "@/lib/blog";
import { DESC_LIMIT, TITLE_LIMIT, lengthStatus } from "../use-studio-data";
import { Thumb } from "../fields";

// SEO Studio -> Blog: every post (drafts and published), newest edit first
export default function StudioBlogList() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);

  useEffect(() => {
    listBlogPosts().then((res) => {
      if (actionFailed(res) || !res.ok) return setPosts([]);
      setPosts(res.data ?? []);
    });
  }, []);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1">Blog</h1>
          <p className="text-sm md:text-base text-gray-500 max-w-2xl">
            Write posts with photos, alt text and links. Drafts stay hidden; a post is on the website (and in the sitemap
            for Google) only once you publish it. Posts are shown at{" "}
            <a href="/blog" target="_blank" className="text-ocean underline">
              /blog
            </a>
            .
          </p>
        </div>
        <Link
          href="/seo/blog/new"
          className="flex items-center gap-2 bg-navy hover:bg-navy/90 text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider"
        >
          <Plus size={15} /> New post
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {posts === null ? (
          <div className="h-40 flex items-center justify-center text-gray-400">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No posts yet.{" "}
            <Link href="/seo/blog/new" className="text-ocean font-semibold underline">
              Write the first one
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {posts.map((p) => {
              const issues = [
                ...publishProblems(p),
                ...(lengthStatus(blogTitle(p), TITLE_LIMIT) === "long" ? ["Google title too long"] : []),
                ...(lengthStatus(p.description, DESC_LIMIT) === "short" ? ["Description short"] : []),
                ...(wordCount(p.blocks) < 300 ? ["Under 300 words"] : []),
              ];
              return (
                <li key={p.id} className="flex items-center gap-4 px-4 md:px-6 py-4 hover:bg-gray-50 group">
                  <Link href={`/seo/blog/${p.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <Thumb src={p.cover_image} className="w-20 h-14 hidden sm:block" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-navy truncate">{p.title || "Untitled"}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            p.status === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {p.status === "published" ? "Published" : "Draft"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono truncate">/blog/{p.slug}</div>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {issues.slice(0, 3).map((issue) => (
                          <span key={issue} className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            {issue}
                          </span>
                        ))}
                        <span className="text-[11px] text-gray-400 px-1 py-0.5">
                          {wordCount(p.blocks)} words · edited {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                  {p.status === "published" && (
                    <a href={`/blog/${p.slug}`} target="_blank" title="View on the website" className="p-2 text-gray-300 hover:text-navy">
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-navy shrink-0" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
