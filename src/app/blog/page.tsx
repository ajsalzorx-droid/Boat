import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heading, StyledHeading } from "@/components/ContentText";
import { paragraphsOf, readingMinutes } from "@/lib/blog";
import { getPublishedPosts } from "@/lib/blog-data";
import { getBusinessInfo, getSeoPages, pageMetadata } from "@/lib/seo-data";
import { blogIntroSection, blogSection } from "@/lib/blog-content";

// Title, description and share image come from SEO Studio -> Pages -> Blog (like every page).
// While no post is live, the page is kept out of Google (an empty page is thin content).
export async function generateMetadata(): Promise<Metadata> {
  const [meta, posts] = await Promise.all([pageMetadata("/blog"), getPublishedPosts()]);
  return posts.some((p) => !p.noindex) ? meta : { ...meta, robots: { index: false, follow: true } };
}

const dateText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" }) : "";

export default async function BlogIndexPage() {
  const [posts, hero, introSection, seoPages, business] = await Promise.all([
    getPublishedPosts(),
    blogSection(),
    blogIntroSection(),
    getSeoPages(),
    getBusinessInfo(),
  ]);
  const readTime = (n: number) => (hero.fields.read_time || "{n} min read").replaceAll("{n}", String(n));

  // Intro: photo left, text right (SEO Studio -> Pages -> Blog -> Intro). Empty fields use the
  // page's share image and meta description, so what is entered under "Google & sharing" shows here.
  const seo = seoPages["/blog"];
  const f = introSection.fields;
  const intro = {
    image: f.image || seo?.og_image || business.default_og_image || "",
    alt: f.image_alt || (f.image ? "" : seo?.title) || "",
    title: f.title || "",
    paragraphs: paragraphsOf(f.body || seo?.description || ""),
  };
  const hasIntro = !!intro.image || intro.paragraphs.length > 0;

  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen">
        <section className="relative pt-44 pb-20 px-8 md:px-20 bg-navy text-white overflow-hidden">
          <div className="relative z-10 max-w-4xl">
            {hero.fields.eyebrow && (
              <span className="inline-flex items-center gap-3.5 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-6">
                <span className="w-8 h-[1px] bg-ocean shrink-0"></span>
                {hero.fields.eyebrow}
              </span>
            )}
            <StyledHeading as="h1" choice={hero.fields.title_style} className="font-playfair text-[clamp(40px,6vw,84px)] font-bold leading-none mb-6">
              <Heading c={hero} emClassName="italic text-ocean" />
            </StyledHeading>
            {hero.fields.body && <p className="text-[15px] text-white/60 max-w-xl leading-relaxed font-light">{hero.fields.body}</p>}
          </div>
        </section>

        <section className="py-20 px-8 md:px-20">
          {hasIntro && (
            <div className={`grid grid-cols-1 ${intro.image && intro.paragraphs.length ? "md:grid-cols-2" : ""} gap-10 md:gap-16 items-center max-w-6xl mx-auto ${posts.length ? "mb-20" : ""}`}>
              {intro.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={intro.image}
                  alt={intro.alt}
                  loading="eager"
                  decoding="async"
                  // The photo's own shape (cropping would cut text on a poster), at most 600px tall
                  className="block w-auto h-auto max-w-full max-h-[600px] mx-auto rounded-[2rem] shadow-xl"
                />
              )}
              {(intro.title || intro.paragraphs.length > 0) && (
                <div>
                  {intro.title && <StyledHeading as="h2" choice={f.title_style} className="font-playfair text-3xl md:text-4xl font-bold text-navy mb-5 leading-tight">{intro.title}</StyledHeading>}
                  <div className="space-y-4 text-[17px] leading-[1.85] text-navy/75 font-light">
                    {intro.paragraphs.map((p, n) => (
                      <p key={n} className="whitespace-pre-line">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {posts.length === 0 ? (
            !hasIntro &&
            <p className="text-navy/60 text-center py-20">{hero.fields.empty}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {posts.map((p, i) => (
                <article key={p.id} className="group">
                  <Link href={`/blog/${p.slug}`} className="block">
                    <div className="aspect-[4/3] overflow-hidden bg-navy/10 mb-6">
                      {p.cover_image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.cover_image}
                          alt={p.cover_alt}
                          loading={i < 3 ? "eager" : "lazy"}
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      )}
                    </div>
                    <div className="text-[10px] tracking-[3px] uppercase text-ocean font-bold mb-3">
                      <time dateTime={p.published_at ?? undefined}>{dateText(p.published_at)}</time> · {readTime(readingMinutes(p.blocks))}
                    </div>
                    <StyledHeading as="h2" choice={hero.fields.post_style} className="font-playfair text-2xl font-bold text-navy mb-3 group-hover:text-ocean transition-colors leading-snug">{p.title}</StyledHeading>
                    <p className="text-navy/60 text-[15px] leading-relaxed font-light line-clamp-3">{p.description}</p>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
