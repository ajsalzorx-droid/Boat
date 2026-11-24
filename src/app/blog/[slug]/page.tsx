import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogArticle from "@/components/BlogArticle";
import { blogTitle, plainText, readingMinutes, wordCount, type BlogPost } from "@/lib/blog";
import { findPublishedPost, getPublishedPosts } from "@/lib/blog-data";
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
  const [found, business, hero, posts] = await Promise.all([findPublishedPost(slug), getBusinessInfo(), blogSection(), getPublishedPosts()]);
  if (!found) notFound();
  // The post moved to a new address: send visitors and Google there (301)
  if (found.redirect) permanentRedirect(`/blog/${found.post.slug}`);
  const p = found.post;
  const more = posts.filter((o) => o.id !== p.id && !o.noindex).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output, with "<" escaped so text can't close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(p, business)).replace(/</g, "\\u003c") }}
      />
      <Navbar />
      <main className="bg-cream min-h-screen">
        <BlogArticle
          post={p}
          date={dateText(p.published_at)}
          dateTime={p.published_at ?? undefined}
          readTime={(hero.fields.read_time || "{n} min read").replaceAll("{n}", String(readingMinutes(p.blocks)))}
          url={`${siteUrl(business).origin}/blog/${p.slug}`}
          more={more}
          moreDates={more.map((o) => dateText(o.published_at))}
        />
      </main>
      <Footer />
    </>
  );
}
