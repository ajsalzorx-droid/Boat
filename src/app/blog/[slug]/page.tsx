import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogContent from "@/components/BlogContent";
import { blogTitle, plainText, readingMinutes, wordCount, type BlogPost } from "@/lib/blog";
import { findPublishedPost } from "@/lib/blog-data";
import { blogSection } from "@/lib/blog-content";
import { getBusinessInfo } from "@/lib/seo-data";
import { FALLBACK_SHARE_IMAGE, siteUrl, type BusinessInfo } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

// No posts are built ahead; each post is built on its first visit and then kept like every page
// (rebuilt at most every 60 s, and straight away when the post is saved). Unknown addresses 404.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [found, business] = await Promise.all([findPublishedPost(slug), getBusinessInfo()]);
  if (!found) return { title: "Post not found | Boat Seafood Dubai", robots: { index: false, follow: true } };
  const p = found.post;
  const path = `/blog/${p.slug}`;
  const title = blogTitle(p);
  const description = p.description || plainText(p.blocks).slice(0, 160);
  const image = p.cover_image
    ? { url: p.cover_image, alt: p.cover_alt }
    : business.default_og_image
      ? { url: business.default_og_image }
      : FALLBACK_SHARE_IMAGE;

  return {
    metadataBase: siteUrl(business),
    title,
    description,
    alternates: { canonical: path },
    robots: p.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      url: path,
      siteName: business.name,
      title,
      description,
      locale: "en_AE",
      images: [image],
      publishedTime: p.published_at ?? undefined,
      modifiedTime: p.updated_at,
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

function articleJsonLd(p: BlogPost, business: BusinessInfo) {
  const origin = siteUrl(business).origin;
  const url = `${origin}/blog/${p.slug}`;
  const abs = (src: string) => new URL(src, origin).href;
  const images = [p.cover_image, ...p.blocks.map((b) => (b.type === "image" ? b.src : ""))].filter(Boolean).map(abs);
  const org = { "@type": "Organization", name: business.name, url: origin };
  return [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title.slice(0, 110),
      description: p.description,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      ...(images.length && { image: images }),
      datePublished: p.published_at ?? p.created_at,
      dateModified: p.updated_at,
      wordCount: wordCount(p.blocks),
      inLanguage: "en",
      author: org,
      publisher: org,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${origin}/blog` },
        { "@type": "ListItem", position: 3, name: p.title, item: url },
      ],
    },
  ];
}

const dateText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" }) : "";

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [found, business, hero] = await Promise.all([findPublishedPost(slug), getBusinessInfo(), blogSection()]);
  if (!found) notFound();
  // The post moved to a new address: send visitors and Google there (301)
  if (found.redirect) permanentRedirect(`/blog/${found.post.slug}`);
  const p = found.post;

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output, with "<" escaped so text can't close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(p, business)).replace(/</g, "\\u003c") }}
      />
      <Navbar />
      <main className="bg-cream min-h-screen">
        <header className="relative pt-44 pb-16 px-8 md:px-20 bg-navy text-white">
          <div className="max-w-3xl mx-auto">
            <nav aria-label="Breadcrumb" className="mb-8">
              <Link href="/blog" className="inline-flex items-center gap-2 text-[10px] tracking-[4px] uppercase text-ocean font-bold hover:text-white transition-colors">
                <ArrowLeft size={14} aria-hidden /> Blog
              </Link>
            </nav>
            <h1 className="font-playfair text-[clamp(34px,5vw,64px)] font-bold leading-[1.05] mb-6">{p.title}</h1>
            <div className="text-[11px] tracking-[3px] uppercase text-white/50">
              <time dateTime={p.published_at ?? undefined}>{dateText(p.published_at)}</time> · {(hero.fields.read_time || "{n} min read").replaceAll("{n}", String(readingMinutes(p.blocks)))}
            </div>
          </div>
        </header>

        <article className="px-6 md:px-20 py-16">
          <div className="max-w-3xl mx-auto">
            {p.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_image} alt={p.cover_alt} fetchPriority="high" decoding="async" className="w-full h-auto mb-12 -mt-28 md:-mt-32 relative shadow-xl" />
            )}
            <BlogContent blocks={p.blocks} />
            <div className="mt-16 pt-10 border-t border-navy/10 flex flex-wrap gap-4">
              <Link href="/book" className="bg-navy text-cream px-6 py-3.5 text-[11px] tracking-[3px] uppercase font-bold hover:bg-ocean transition-colors">
                Book a table
              </Link>
              <Link href="/menu" className="border border-navy/20 text-navy px-6 py-3.5 text-[11px] tracking-[3px] uppercase font-bold hover:border-ocean hover:text-ocean transition-colors">
                See the menu
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
