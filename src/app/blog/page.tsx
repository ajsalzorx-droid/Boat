import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogIndex from "@/components/BlogIndex";
import type { BlogPost } from "@/lib/blog";
import { getPublishedPosts } from "@/lib/blog-data";
import { getBusinessInfo, getSeoPages, pageMetadata } from "@/lib/seo-data";
import { siteUrl, type BusinessInfo } from "@/lib/seo";
import { blogIntroSection, blogSection } from "@/lib/blog-content";

// Title, description and share image come from SEO Studio -> Pages -> Blog (like every page).
// While no post is live, the page is kept out of Google (an empty page is thin content).
export async function generateMetadata(): Promise<Metadata> {
  const [meta, posts] = await Promise.all([pageMetadata("/blog"), getPublishedPosts()]);
  return posts.some((p) => !p.noindex) ? meta : { ...meta, robots: { index: false, follow: true } };
}

const dateText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" }) : "";

// What Google reads: this is a blog, with these posts, and where it sits on the site
function blogJsonLd(posts: BlogPost[], business: BusinessInfo, name: string, description: string) {
  const origin = siteUrl(business).origin;
  const org = { "@type": "Organization", name: business.name, url: origin };
  return [
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": `${origin}/blog`,
      url: `${origin}/blog`,
      name,
      description,
      inLanguage: "en",
      publisher: org,
      blogPost: posts
        .filter((p) => !p.noindex)
        .map((p) => ({
          "@type": "BlogPosting",
          headline: p.title.slice(0, 110),
          description: p.description,
          url: `${origin}/blog/${p.slug}`,
          ...(p.cover_image && { image: new URL(p.cover_image, origin).href }),
          datePublished: p.published_at ?? p.created_at,
          dateModified: p.updated_at,
          author: org,
        })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${origin}/blog` },
      ],
    },
  ];
}

export default async function BlogIndexPage() {
  const [posts, hero, introSection, seoPages, business] = await Promise.all([
    getPublishedPosts(),
    blogSection(),
    blogIntroSection(),
    getSeoPages(),
    getBusinessInfo(),
  ]);

  // Intro photo and text (SEO Studio -> Pages -> Blog -> Intro). Empty fields use the page's share
  // image and meta description, so what is entered under "Google & sharing" shows here.
  const seo = seoPages["/blog"];
  const f = introSection.fields;
  const intro = {
    image: f.image || seo?.og_image || business.default_og_image || "",
    alt: f.image_alt || (f.image ? "" : seo?.title) || "",
    title: f.title || "",
    titleStyle: f.title_style,
    body: f.body || seo?.description || "",
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output, with "<" escaped so text can't close the script tag
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogJsonLd(posts, business, seo?.title || "Blog", seo?.description || "")).replace(/</g, "\\u003c"),
        }}
      />
      <Navbar />
      <main className="bg-cream min-h-screen">
        <BlogIndex hero={hero} intro={intro} posts={posts} dateText={dateText} />
      </main>
      <Footer />
    </>
  );
}
