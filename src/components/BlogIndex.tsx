import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Fish } from "lucide-react";
import BlogContent from "@/components/BlogContent";
import BlogGrid from "@/components/BlogGrid";
import { Heading, StyledHeading } from "@/components/ContentText";
import { blogPieces, blogSrc, blogSrcSet } from "@/lib/blog-layout";
import { readingMinutes, type BlogPost } from "@/lib/blog";
import type { SectionData } from "@/lib/content";

// The blog's front page (src/app/blog/page.tsx): title and photo, the posts, then the rest of the page's text. The texts come from SEO Studio -> Pages -> Blog.

type Intro = { image: string; alt: string; title: string; titleStyle?: string; body: string };
type Props = { hero: SectionData; intro: Intro; posts: BlogPost[]; dateText: (iso: string | null) => string };

function Photo({ src, alt, sizes, eager, className }: { src: string; alt: string; sizes: string; eager?: boolean; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={blogSrc(src, 1200)}
      srcSet={blogSrcSet(src)}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      className={className}
    />
  );
}

export default function BlogIndex({ hero, intro, posts, dateText }: Props) {
  const f = hero.fields;
  // The opening paragraph sits under the title; whatever follows it goes below the posts
  const pieces = blogPieces(f.body ? [{ type: "paragraph", text: f.body }] : []);
  const lead = pieces[0]?.type === "paragraph" ? pieces[0].text : "";
  const rest = lead ? pieces.slice(1) : pieces;
  const introPieces = blogPieces(intro.body ? [{ type: "paragraph", text: intro.body }] : []);
  // One post: a wide card. Two: side by side. More: the newest wide, the others as cards under it
  const wide = posts.length === 2 ? null : posts[0];
  const cards = wide ? posts.slice(1) : posts;
  const twoColumns = cards.length === 2 || cards.length === 4; // rows without gaps
  const lift = "-mt-10 md:-mt-14"; // over the edge of the title area

  const meta = (p: BlogPost) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-normal text-navy/70">
      {p.published_at && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} className="text-ocean" aria-hidden /> <time dateTime={p.published_at}>{dateText(p.published_at)}</time>
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Clock size={14} className="text-ocean" aria-hidden /> {(f.read_time || "{n} min read").replaceAll("{n}", String(readingMinutes(p.blocks)))}
      </span>
    </div>
  );
  const readMore = (
    <span aria-hidden className="inline-flex items-center gap-2 text-[12px] tracking-[2px] uppercase font-bold text-navy">
      Read more <ArrowRight size={16} className="text-ocean transition-transform group-hover:translate-x-1" />
    </span>
  );
  const titleHover = "text-navy underline decoration-transparent decoration-2 underline-offset-4 group-hover:decoration-ocean transition-colors";
  // A post without a cover photo still has a picture-sized place
  const noPhoto = (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#003049,#1f5577)] text-ocean-light">
      <Fish size={48} strokeWidth={1.25} />
    </span>
  );

  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white pt-32 md:pt-44 pb-20 md:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(102,155,188,0.35),transparent_65%),radial-gradient(40rem_24rem_at_0%_110%,rgba(102,155,188,0.18),transparent_60%)]" />
        <div className={`relative px-8 md:px-20 ${intro.image ? "grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-14 xl:gap-20" : ""}`}>
          <div className="max-w-3xl">
            {f.eyebrow && (
              <p className="inline-flex items-center gap-3.5 text-[11px] tracking-[3px] md:tracking-[4px] uppercase text-ocean-light font-bold mb-5 md:mb-6">
                <span aria-hidden className="w-8 h-px bg-ocean-light shrink-0" />
                {f.eyebrow}
              </p>
            )}
            <StyledHeading as="h1" choice={f.title_style} className="font-playfair text-[clamp(32px,4.8vw,64px)] font-bold leading-[1.08] text-balance break-words">
              <Heading c={hero} emClassName="italic text-ocean-light" />
            </StyledHeading>
            {lead && <p className="mt-5 md:mt-6 max-w-2xl text-[16px] md:text-[18px] leading-relaxed text-white/75">{lead}</p>}
          </div>
          {intro.image && (
            // The photo's own shape: cropping would cut the text on a poster
            <Photo
              src={intro.image}
              alt={intro.alt}
              eager
              sizes="(min-width: 1024px) 480px, 100vw"
              className="block mx-auto lg:mr-0 h-auto w-auto max-w-full max-h-[420px] lg:max-h-[520px] rounded-[1.75rem] shadow-2xl ring-1 ring-white/15"
            />
          )}
        </div>
      </section>

      {posts.length > 0 ? (
        <section aria-label="Posts" className="px-8 md:px-20">
          {wide && (
            <article className={`group relative ${lift} overflow-hidden rounded-3xl bg-[#fffaf0] border border-navy/10 shadow-xl`}>
              <Link href={`/blog/${wide.slug}`} className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[400px] relative overflow-hidden bg-navy/10">
                  {wide.cover_image ? (
                    <Photo
                      src={wide.cover_image}
                      alt={wide.cover_alt}
                      eager={!intro.image}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  ) : (
                    noPhoto
                  )}
                  {cards.length > 0 && (
                    <span className="absolute left-4 top-4 rounded-full bg-cream px-3.5 py-1.5 text-[10px] tracking-[2px] uppercase font-bold text-navy shadow">Latest</span>
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10 xl:p-12">
                  {meta(wide)}
                  <StyledHeading as="h2" choice={f.post_style} className={`mt-3 font-playfair text-[24px] sm:text-[28px] lg:text-[34px] font-bold leading-[1.18] text-balance break-words ${titleHover}`}>
                    {wide.title}
                  </StyledHeading>
                  {wide.description && <p className="mt-3 md:mt-4 mb-5 md:mb-6 text-[16px] font-normal leading-relaxed text-navy/75">{wide.description}</p>}
                  {readMore}
                </div>
              </Link>
            </article>
          )}

          {cards.length > 0 && (
            <div className={wide ? "mt-10 md:mt-14" : `relative ${lift}`}>
              <BlogGrid step={6} above={wide ? 1 : 0} className={`grid gap-6 sm:grid-cols-2 lg:gap-8 ${twoColumns ? "" : "lg:grid-cols-3"}`}>
                {cards.map((p) => (
                  <article key={p.id} className={`group flex w-full overflow-hidden rounded-2xl bg-[#fffaf0] border border-navy/10 hover:shadow-xl transition-shadow ${wide ? "shadow-sm" : "shadow-xl"}`}>
                    <Link href={`/blog/${p.slug}`} className="flex w-full min-w-0 flex-col">
                      <div className={`relative overflow-hidden bg-navy/10 ${twoColumns ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
                        {p.cover_image ? (
                          <Photo
                            src={p.cover_image}
                            alt={p.cover_alt}
                            sizes={`(min-width: 1024px) ${twoColumns ? 46 : 30}vw, (min-width: 640px) 50vw, 100vw`}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          noPhoto
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5 md:p-6">
                        {meta(p)}
                        <StyledHeading as="h2" choice={f.post_style} className={`mt-2.5 font-playfair ${twoColumns ? "text-xl md:text-2xl" : "text-xl"} font-bold leading-snug text-balance break-words line-clamp-3 ${titleHover}`}>
                          {p.title}
                        </StyledHeading>
                        {p.description && <p className="mt-2 text-[15px] font-normal leading-relaxed text-navy/70 line-clamp-3">{p.description}</p>}
                        <div className="mt-auto pt-5">{readMore}</div>
                      </div>
                    </Link>
                  </article>
                ))}
              </BlogGrid>
            </div>
          )}
        </section>
      ) : (
        !introPieces.length && !rest.length && <p className="text-navy/60 text-center px-6 py-20">{f.empty}</p>
      )}

      {(intro.title || introPieces.length > 0 || rest.length > 0) && (
        <section aria-label="About" className="px-8 md:px-20 pt-14 md:pt-20">
          <div className="max-w-3xl">
            {intro.title && (
              <StyledHeading as="h2" choice={intro.titleStyle} className="font-playfair text-2xl md:text-3xl font-bold text-navy mb-5 leading-tight text-balance">
                {intro.title}
              </StyledHeading>
            )}
            <BlogContent pieces={[...introPieces, ...rest]} />
          </div>
        </section>
      )}

      <section aria-label="Visit us" className="px-8 md:px-20 py-14 md:py-20">
        <div className="rounded-3xl bg-navy px-6 py-9 sm:px-10 md:px-14 md:py-12 text-white text-center md:text-left md:flex md:items-center md:justify-between md:gap-10">
          <div>
            <p className="font-playfair text-2xl md:text-3xl font-bold leading-tight">Hungry for seafood?</p>
            <p className="mt-2 text-[15px] md:text-[16px] leading-relaxed text-white/75">Fresh from Waterfront Market, Deira, cooked the way you like it.</p>
          </div>
          <div className="mt-6 md:mt-0 flex flex-col sm:flex-row justify-center gap-3 shrink-0">
            <Link href="/book" className="inline-flex items-center justify-center rounded-full bg-cream text-navy px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-bold hover:bg-ocean transition-colors">
              Book a table
            </Link>
            <Link href="/menu" className="inline-flex items-center justify-center rounded-full border border-white/30 text-white px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-bold hover:border-cream hover:text-cream transition-colors">
              See the menu
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
