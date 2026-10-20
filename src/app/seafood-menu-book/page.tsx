import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import FlipBook from "@/components/FlipBook";
import { Heading, Lines } from "@/components/ContentText";
import { MENU_CATEGORIES, type MenuItem } from "@/data/menu";
import { getSiteContent } from "@/lib/content";
import { getActiveMenuItems } from "@/lib/menu-data";
import { getBusinessInfo, menuJsonLd, pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("/seafood-menu-book");

// Dishes per page; a page is square, so more would not fit
const DISHES_PER_PAGE = 4;

type BookPageData = { title: string; hard?: boolean; dark?: boolean; body: ReactNode };

export default async function MenuBookPage() {
  const [content, items, business] = await Promise.all([getSiteContent(), getActiveMenuItems(), getBusinessInfo()]);
  const intro = content.book_intro;
  const cover = content.book_cover.fields;
  const story = content.book_story.fields;
  const back = content.book_back.fields;
  const quote = content.manifesto;

  // Menu pages: dishes grouped by category (menu page order), split into pages of DISHES_PER_PAGE.
  // A dish listed twice in Admin → Menu (same name) appears once, as on the home page.
  const seen = new Set<string>();
  const dishesOnce = items.filter((i) => {
    const key = i.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const order = (c: string) => (MENU_CATEGORIES.includes(c) ? MENU_CATEGORIES.indexOf(c) : MENU_CATEGORIES.length);
  const categories = [...new Set(dishesOnce.map((i) => i.category))].sort((a, b) => order(a) - order(b));
  const menuPages = categories.flatMap((category) => {
    const dishes = dishesOnce.filter((i) => i.category === category);
    const chunks = Array.from({ length: Math.ceil(dishes.length / DISHES_PER_PAGE) }, (_, n) =>
      dishes.slice(n * DISHES_PER_PAGE, (n + 1) * DISHES_PER_PAGE)
    );
    return chunks.map((chunk, n) => ({ category, dishes: chunk, continued: n > 0 }));
  });

  // Fixed pages before the menu: cover, story, contents
  const FIRST_MENU_PAGE = 4;
  const contents = categories.map((category) => ({
    category,
    page: FIRST_MENU_PAGE + menuPages.findIndex((p) => p.category === category),
  }));

  const pages: BookPageData[] = [
    {
      title: "Cover",
      hard: true,
      dark: true,
      body: (
        <div className="relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover.image} alt={cover.image_alt} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/55 to-navy/90" />
          <div className="absolute inset-[4cqw] border border-[#C49A3C]/50" />
          <div className="relative flex h-full flex-col items-center justify-center text-center px-[10cqw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={cover.logo_alt} className="h-[16cqw] w-auto brightness-0 invert mb-[5cqw]" />
            <h2 className="font-playfair font-bold text-white leading-none text-[9cqw]">{cover.title}</h2>
            <p className="font-playfair italic text-ocean text-[7cqw] mt-[1.5cqw]">{cover.subtitle}</p>
            <span className="mt-[5cqw] h-px w-[14cqw] bg-[#C49A3C]" aria-hidden="true" />
            <p className="mt-[4cqw] text-[2.4cqw] tracking-[0.5em] uppercase text-white/75">{cover.tagline}</p>
          </div>
        </div>
      ),
    },
    {
      title: story.eyebrow || "Our Story",
      body: (
        <div className="flex h-full flex-col px-[9cqw] pt-[9cqw] pb-[9cqw]">
          <p className="text-[2.2cqw] tracking-[0.4em] uppercase text-ocean font-semibold">{story.eyebrow}</p>
          <h2 className="font-playfair font-bold text-navy text-[6.2cqw] leading-[1.1] mt-[2.5cqw]">{story.title}</h2>
          <p className="font-jost text-navy/75 text-[3cqw] leading-[1.7] mt-[3.5cqw]">{story.body}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.image} alt={story.image_alt} className="mt-auto h-[38cqw] w-full object-cover rounded-[1cqw]" />
        </div>
      ),
    },
    {
      title: story.contents_title || "Contents",
      body: (
        <div className="flex h-full flex-col px-[10cqw] pt-[10cqw] pb-[8cqw]">
          <h2 className="font-playfair font-bold text-navy text-[8cqw] leading-none">{story.contents_title}</h2>
          <span className="mt-[3cqw] h-px w-[12cqw] bg-[#C49A3C]" aria-hidden="true" />
          <ol className="mt-[6cqw] space-y-[2.6cqw]">
            {contents.map((c) => (
              <li key={c.category} className="flex items-baseline gap-[2cqw] font-jost text-navy text-[3.4cqw]">
                <span>{c.category}</span>
                <span className="flex-1 border-b border-dotted border-navy/25" aria-hidden="true" />
                <span className="tabular-nums text-navy/60">{c.page}</span>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    ...menuPages.map(
      (p): BookPageData => ({
        title: p.continued ? `${p.category} (continued)` : p.category,
        body: <MenuPageBody category={p.category} continued={p.continued} dishes={p.dishes} />,
      })
    ),
  ];

  // With covers on their own, the back cover only closes the book properly after an even count
  if ((pages.length + 1) % 2 === 1) {
    pages.push({
      title: quote.fields.eyebrow || "Our Promise",
      body: (
        <figure className="flex h-full flex-col items-center justify-center text-center px-[11cqw] bg-[#001a24]">
          <blockquote className="font-cormorant italic font-bold text-white text-[6.5cqw] leading-[1.35]">
            &ldquo;
            <Heading c={quote} emClassName="not-italic text-ocean" />
            &rdquo;
          </blockquote>
          <figcaption className="mt-[5cqw] text-[2.2cqw] tracking-[0.35em] uppercase text-white/50">{quote.fields.cite}</figcaption>
        </figure>
      ),
      dark: true,
    });
  }

  pages.push({
    title: back.title || "Visit Us",
    hard: true,
    dark: true,
    body: (
      <div className="relative flex h-full flex-col items-center justify-center text-center bg-navy px-[10cqw]">
        <div className="absolute inset-[4cqw] border border-[#C49A3C]/40" />
        <h2 className="font-playfair font-bold text-white text-[8cqw] leading-none">{back.title}</h2>
        <span className="mt-[4cqw] h-px w-[12cqw] bg-[#C49A3C]" aria-hidden="true" />
        <address className="not-italic mt-[5cqw] font-jost text-white/80 text-[3.2cqw] leading-[1.7]">
          <Lines text={back.address} />
          <br />
          {back.hours}
          <br />
          {back.phone}
        </address>
        <a
          href={back.cta_link}
          className="relative mt-[6cqw] rounded-[1cqw] bg-ocean px-[7cqw] py-[2.6cqw] text-navy text-[2.6cqw] font-bold tracking-[0.3em] uppercase hover:bg-white transition-colors"
        >
          {back.cta}
        </a>
        <p className="mt-[7cqw] font-playfair italic text-ocean text-[3.6cqw]">{back.closing}</p>
      </div>
    ),
  });

  // Standalone viewer (opened in a new tab from the navbar), like a Heyzine flipbook:
  // no site header/footer, just a slim top bar and the book filling the screen
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-white">
      {/* Soft light shapes, like a magazine reader backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(102,155,188,0.18),transparent_60%),linear-gradient(115deg,transparent_55%,rgba(255,255,255,0.04)_55%,rgba(255,255,255,0.04)_70%,transparent_70%),linear-gradient(180deg,#001a24_0%,#002433_100%)]"
      />

      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-ink/60 px-4 backdrop-blur-md md:px-8">
        <Link href="/" aria-label="Boat Seafood home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={cover.logo_alt} className="h-10 w-auto brightness-0 invert" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="hidden text-[9px] font-bold uppercase tracking-[4px] text-ocean sm:block">{intro.fields.eyebrow}</p>
          <h1 className="truncate font-playfair text-lg font-bold leading-tight md:text-2xl">
            <Heading c={intro} emClassName="italic text-ocean" />
          </h1>
        </div>
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[2px] text-white/80 transition-colors hover:border-ocean hover:text-white md:px-4"
        >
          <span className="hidden sm:inline">Visit website</span>
          <ArrowUpRight size={16} aria-hidden="true" />
          <span className="sr-only sm:hidden">Visit website</span>
        </Link>
      </header>

      <main className="relative flex flex-1 flex-col justify-center px-4 py-6 md:px-10">
        {/* Menu schema: Google reads the dishes and prices */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(menuJsonLd(business, items)).replace(/</g, "\\u003c") }}
        />
        {/* Intro text for Google and screen readers (the viewer keeps the screen for the book) */}
        <p className="sr-only">{intro.fields.body}</p>

        <FlipBook label={`${cover.title} ${cover.subtitle}`} titles={pages.map((p) => p.title)}>
          {pages.map((p, i) => (
            <section
              key={i}
              className={`flip-page ${p.dark ? "bg-navy text-white" : "bg-[#fbf6ea] text-navy"}`}
              data-density={p.hard ? "hard" : "soft"}
              aria-label={`Page ${i + 1}: ${p.title}`}
            >
              {p.body}
              {!p.hard && (
                <span className="absolute bottom-[3cqw] left-0 right-0 text-center text-[2cqw] tabular-nums opacity-40" aria-hidden="true">
                  {i + 1}
                </span>
              )}
            </section>
          ))}
        </FlipBook>

        <p className="mt-4 text-center text-xs tracking-[2px] text-white/40">{intro.fields.hint}</p>
      </main>
    </div>
  );
}

function MenuPageBody({ category, continued, dishes }: { category: string; continued: boolean; dishes: MenuItem[] }) {
  return (
    <div className="relative flex h-full flex-col px-[8cqw] pt-[8cqw] pb-[9cqw]">
      <div className="flex items-end justify-between gap-[3cqw] border-b border-navy/10 pb-[3cqw]">
        <h2 className="font-playfair font-bold text-navy text-[6.4cqw] leading-none">{category}</h2>
        {continued && <span className="text-[2.2cqw] tracking-[0.3em] uppercase text-navy/40">continued</span>}
      </div>
      <ul className="mt-[3cqw] flex flex-1 flex-col justify-around">
        {dishes.map((dish) => (
          <li key={dish.id}>
            <article className="flex items-center gap-[3.5cqw]">
              {dish.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dish.image} alt={dish.name} loading="lazy" className="h-[15cqw] w-[15cqw] shrink-0 rounded-full object-cover shadow-sm" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-[2cqw]">
                  <h3 className="font-playfair font-bold text-navy text-[3.8cqw] leading-tight">{dish.name}</h3>
                  <span className="shrink-0 font-jost text-ocean text-[3.4cqw] font-medium tabular-nums">AED {dish.price}</span>
                </div>
                {dish.description && (
                  <p className="mt-[0.8cqw] font-jost text-navy/65 text-[2.6cqw] leading-[1.5] line-clamp-2">{dish.description}</p>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
