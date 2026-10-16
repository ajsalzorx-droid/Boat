"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, ExternalLink, Image as ImageIcon, FileText } from "lucide-react";
import { STUDIO_PAGES } from "@/lib/content";
import { DEFAULT_BUSINESS } from "@/lib/seo";
import { DESC_LIMIT, TITLE_LIMIT, collectAltRefs, lengthStatus, sectionsFor } from "./use-studio-data";
import { useStudio } from "./studio-context";
import { MissingTablesNotice, siteOrigin } from "./fields";

export default function StudioOverview() {
  const { data } = useStudio();
  if (!data) return <div className="h-60 flex items-center justify-center text-gray-400">Loading…</div>;

  const origin = siteOrigin(data.business.site_url, DEFAULT_BUSINESS.site_url);
  const altRefs = collectAltRefs(data.content);
  const weakAlts = altRefs.filter((r) => r.value.trim().length < 10).length;

  const pages = STUDIO_PAGES.map((p) => {
    const seo = p.seoPath ? data.seoPages[p.seoPath] : null;
    const issues: string[] = [];
    if (seo) {
      const t = lengthStatus(seo.title, TITLE_LIMIT);
      const d = lengthStatus(seo.description, DESC_LIMIT);
      if (t !== "good") issues.push(t === "long" ? "Title too long" : "Title too short");
      if (d !== "good") issues.push(d === "long" ? "Description too long" : "Description too short");
      if (seo.noindex) issues.push("Hidden from Google");
    }
    const sections = sectionsFor(p.slug);
    const edited = sections.filter((s) => data.customised.has(s.id)).length;
    return { ...p, seo, issues, sections: sections.length, edited };
  });

  const tools = [
    { name: "Google Search Console", desc: "Indexing, keywords and clicks", href: "https://search.google.com/search-console" },
    { name: "Rich Results Test", desc: "Checks the restaurant details Google reads", href: `https://search.google.com/test/rich-results?url=${encodeURIComponent(origin)}` },
    { name: "PageSpeed Insights", desc: "Speed and Core Web Vitals", href: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(origin)}` },
    { name: "Sitemap", desc: "The page list Google crawls", href: "/sitemap.xml" },
  ];

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1">Overview</h1>
        <p className="text-sm md:text-base text-gray-500">
          Edit every page&apos;s text, Google title, share image and photo alt text. Save keeps changes as a draft; Confirm &amp; Publish (top bar) puts them on the website.
        </p>
      </div>

      {data.missingTables && <MissingTablesNotice />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat icon={FileText} label="Pages" value={String(STUDIO_PAGES.length)} />
        <Stat
          icon={AlertTriangle}
          label="SEO issues"
          value={String(pages.reduce((n, p) => n + p.issues.length, 0))}
          tone={pages.some((p) => p.issues.length) ? "warn" : "good"}
        />
        <Link href="/seo/images" className="block">
          <Stat icon={ImageIcon} label="Images missing good alt text" value={`${weakAlts} / ${altRefs.length}`} tone={weakAlts ? "warn" : "good"} />
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 font-playfair text-lg font-bold text-navy">Pages</div>
        <ul className="divide-y divide-gray-100">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link href={`/seo/pages/${p.slug}`} className="flex items-center gap-4 px-4 md:px-6 py-4 hover:bg-gray-50 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy">{p.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{p.seoPath ?? "every page"}</span>
                  </div>
                  {p.seo && <div className="text-sm text-gray-500 truncate">{p.seo.title}</div>}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {p.issues.map((issue) => (
                      <span key={issue} className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {issue}
                      </span>
                    ))}
                    {p.seo && !p.issues.length && (
                      <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 size={12} /> Title &amp; description OK
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 px-1 py-0.5">
                      {p.edited} of {p.sections} sections edited
                    </span>
                  </div>
                </div>
                <ArrowRight size={18} className="text-gray-300 group-hover:text-navy group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-playfair text-lg font-bold text-navy mb-3">Google tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((t) => (
            <a
              key={t.name}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-navy/20 group"
            >
              <div className="flex items-center justify-between text-sm font-semibold text-navy">
                {t.name} <ExternalLink size={14} className="text-gray-300 group-hover:text-navy" />
              </div>
              <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  tone?: "warn" | "good";
}) {
  const color = tone === "warn" ? "bg-amber-50 text-amber-600" : tone === "good" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600";
  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 h-full">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-navy">{value}</p>
      </div>
    </div>
  );
}
