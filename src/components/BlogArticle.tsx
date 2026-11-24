import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Utensils } from "lucide-react";
import BlogContent from "@/components/BlogContent";
import BlogShare from "@/components/BlogShare";
import { blogContents, blogPieces, blogSrc, blogSrcSet } from "@/lib/blog-layout";
import type { BlogPost, BlogPostInput } from "@/lib/blog";

// A blog post's page: on the site (src/app/blog/[slug]/page.tsx) and in the studio's preview
// (src/app/seo/blog/BlogPreview.tsx), so both always look the same.
// Phones: everything in one column, the contents list folded. Tablets: one wider column.
// Computers: title beside the cover photo, then the text with a column that stays in view.

type Props = {
  post: BlogPostInput | BlogPost;
  date: string; // as shown
  dateTime?: string;
  readTime: string;
  url?: string; // the full address, to share; none in the studio's preview
  more?: BlogPost[]; // other posts
  moreDates?: string[];
  preview?: boolean; // in the studio: no navbar above, and nothing leads away from the editor
};

export default function BlogArticle({ post, date, dateTime, readTime, url, more = [], moreDates = [], preview = false }: Props) {
  const pieces = blogPieces(post.blocks);
  const contents = blogContents(pieces);
  const showContents = contents.length >= 2;
  const cover = post.cover_image;

  const contentsList = (
    <ol className="space-y-1">
      {contents.map((c) => (
        <li key={c.id}>
          <a href={`#${c.id}`} className="block border-l-2 border-navy/10 hover:border-ocean py-1.5 pl-3.5 text-[14px] font-normal leading-snug text-navy/80 hover:text-navy transition-colors">
            {c.text}
          </a>
        </li>
      ))}
    </ol>
  );

  const actions = (dark: boolean) => {
    const main = `inline-flex w-full sm:w-auto items-center justify-center rounded-full px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-bold transition-colors ${dark ? "bg-cream text-navy hover:bg-ocean" : "bg-navy text-cream hover:bg-ocean hover:text-navy"}`;
    const other = `inline-flex w-full sm:w-auto items-center justify-center rounded-full border px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-bold transition-colors ${dark ? "border-white/30 text-white hover:border-cream hover:text-cream" : "border-navy/25 text-navy hover:border-ocean hover:text-ocean"}`;
    return preview ? (
      <>
        <span className={main}>Book a table</span>
        <span className={other}>See the menu</span>
      </>
    ) : (
      <>
        <Link href="/book" className={main}>
          Book a table
        </Link>
        <Link href="/menu" className={other}>
          See the menu
        </Link>
      </>
    );
  };

  return (
    <>
      <header className={`relative overflow-hidden bg-navy text-white ${preview ? "pt-10 md:pt-16" : "pt-32 md:pt-44 short:pt-32"} ${cover ? "pb-24 sm:pb-32 lg:pb-20" : "pb-14 md:pb-20"}`}>
        {/* Soft light behind the title */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(102,155,188,0.35),transparent_65%),radial-gradient(40rem_24rem_at_0%_110%,rgba(102,155,188,0.18),transparent_60%)]" />
        <div className={`relative mx-auto max-w-6xl px-5 sm:px-8 lg:px-12 ${cover ? "lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-14 xl:gap-20" : ""}`}>
          <div className={cover ? "" : "max-w-3xl"}>
            <nav aria-label="Breadcrumb" className="mb-5 md:mb-7">
              {preview ? (
                <span className="inline-flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-ocean-light font-bold">
                  <ArrowLeft size={14} aria-hidden /> Blog
                </span>
              ) : (
                <Link href="/blog" className="inline-flex items-center gap-2 py-1 text-[11px] tracking-[3px] uppercase text-ocean-light font-bold hover:text-white transition-colors">
                  <ArrowLeft size={14} aria-hidden /> Blog
                </Link>
              )}
            </nav>
            <h1 className="font-playfair text-[clamp(30px,4.4vw,56px)] font-bold leading-[1.1] text-balance break-words">
              {post.title || <span className="text-white/30">Untitled</span>}
            </h1>
            {post.description && <p className="mt-4 md:mt-6 max-w-2xl text-[16px] md:text-[18px] leading-relaxed text-white/75">{post.description}</p>}
            <div className="mt-5 md:mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/70">
              {date && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={15} className="text-ocean-light" aria-hidden /> <time dateTime={dateTime}>{date}</time>
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <Clock size={15} className="text-ocean-light" aria-hidden /> {readTime}
              </span>
            </div>
          </div>
          {cover && (
            <div className="hidden lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blogSrc(cover, 1200)}
                srcSet={blogSrcSet(cover)}
                sizes="(min-width: 1024px) 480px, 100vw"
                alt={post.cover_alt}
                fetchPriority="high"
                decoding="async"
                className="aspect-[4/5] max-h-[560px] w-full rounded-[1.75rem] object-cover shadow-2xl ring-1 ring-white/15"
              />
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12 pb-16 md:pb-24">
        {/* Phones and tablets: the cover overlaps the title area */}
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blogSrc(cover, 1200)}
            srcSet={blogSrcSet(cover)}
            sizes="(min-width: 1024px) 480px, 100vw"
            alt={post.cover_alt}
            decoding="async"
            className="lg:hidden relative -mt-14 sm:-mt-20 aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl sm:rounded-3xl object-cover shadow-xl"
          />
        )}

        <div className="pt-8 md:pt-12 lg:pt-16 lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-14 xl:gap-20">
          <article className="min-w-0 mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-none xl:max-w-[44rem]">
            {showContents && (
              <details className="lg:hidden group mb-8 rounded-2xl border border-navy/10 bg-white/55">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[12px] tracking-[2px] uppercase font-bold text-navy [&::-webkit-details-marker]:hidden">
                  In this post
                  <span aria-hidden className="text-ocean text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <nav aria-label="In this post" className="px-5 pb-4">
                  {contentsList}
                </nav>
              </details>
            )}

            <BlogContent pieces={pieces} />
            {preview && pieces.length === 0 && <p className="text-navy/40 text-center py-10">No content yet. Add text, headings or photos in the editor.</p>}

            {url && (
              <div className="lg:hidden mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-navy/10 pt-6">
                <span className="text-[12px] tracking-[2px] uppercase font-bold text-navy/70">Share this post</span>
                <BlogShare url={url} title={post.title} />
              </div>
            )}
          </article>

          <aside className="hidden lg:block">
            <div className={`sticky space-y-8 ${preview ? "top-8" : "top-32"}`}>
              {showContents && (
                <nav aria-label="In this post">
                  <p className="mb-3 text-[11px] tracking-[3px] uppercase font-bold text-ocean">In this post</p>
                  {contentsList}
                </nav>
              )}
              {url && (
                <div>
                  <p className="mb-3 text-[11px] tracking-[3px] uppercase font-bold text-ocean">Share</p>
                  <BlogShare url={url} title={post.title} />
                </div>
              )}
              <div className="rounded-2xl bg-white/60 border border-navy/10 p-5">
                <Utensils size={22} className="text-ocean mb-3" aria-hidden />
                <p className="font-playfair text-xl font-bold text-navy leading-snug mb-4">Hungry for seafood?</p>
                <div className="flex flex-col gap-2.5 [&>*]:sm:w-full">{actions(false)}</div>
              </div>
            </div>
          </aside>
        </div>

        {/* Phones and tablets: the invitation after the text (computers have it beside it) */}
        <section aria-label="Visit us" className="lg:hidden mx-auto mt-10 max-w-2xl rounded-3xl bg-navy px-6 py-8 sm:px-10 sm:py-10 text-center text-white">
          <p className="font-playfair text-2xl sm:text-3xl font-bold leading-tight">Hungry for seafood?</p>
          <p className="mt-2 mb-6 text-[15px] leading-relaxed text-white/75">Fresh from Waterfront Market, Deira, cooked the way you like it.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">{actions(true)}</div>
        </section>

        {more.length > 0 && (
          <section aria-labelledby="more-posts" className="mt-14 md:mt-20 border-t border-navy/10 pt-10 md:pt-14">
            <h2 id="more-posts" className="font-playfair text-2xl md:text-3xl font-bold text-navy mb-6 md:mb-8">
              More from the blog
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((m, i) => (
                <Link key={m.id} href={`/blog/${m.slug}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-navy/10 mb-4">
                    {m.cover_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={blogSrc(m.cover_image, 800)} srcSet={blogSrcSet(m.cover_image)} sizes="(min-width: 1024px) 350px, (min-width: 640px) 50vw, 100vw" alt={m.cover_alt} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    )}
                  </div>
                  <p className="text-[12px] text-navy/60 mb-1.5">{moreDates[i]}</p>
                  <h3 className="font-playfair text-xl font-bold text-navy leading-snug group-hover:text-ocean transition-colors">{m.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
