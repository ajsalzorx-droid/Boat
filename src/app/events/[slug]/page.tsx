import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Images } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventGallery from "@/components/EventGallery";
import { paragraphsOf } from "@/lib/blog";
import { coverAlt, eventDateText, eventPath, eventTitle, photoAlt, type SiteEvent } from "@/lib/events";
import { findEvent, getEvents } from "@/lib/events-data";
import { getBusinessInfo } from "@/lib/seo-data";
import { siteUrl, type BusinessInfo } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

// Built on the first visit and then kept like every page (rebuilt at most every 60 s, and straight
// away when the event is saved). Unknown and hidden events answer 404.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [found, business] = await Promise.all([findEvent(slug), getBusinessInfo()]);
  if (!found) return { title: "Event not found | Boat Seafood Dubai", robots: { index: false, follow: true } };
  const e = found.event;
  const path = eventPath(e.slug);
  const title = eventTitle(e);
  const image = { url: e.cover_image, alt: coverAlt(e) };

  return {
    metadataBase: siteUrl(business),
    title,
    description: e.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: business.name,
      title,
      description: e.description,
      locale: "en_AE",
      images: [image],
      modifiedTime: e.updated_at,
    },
    twitter: { card: "summary_large_image", title, description: e.description, images: [image] },
  };
}

// What Google reads: the photo gallery, where the page sits on the site and, when the event has a
// date, the event itself (Google needs a start date for one)
function eventJsonLd(e: SiteEvent, business: BusinessInfo) {
  const origin = siteUrl(business).origin;
  const url = `${origin}${eventPath(e.slug)}`;
  const abs = (src: string) => new URL(src, origin).href;
  const org = { "@type": "Organization", name: business.name, url: origin };
  return [
    {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      "@id": url,
      url,
      name: e.title,
      description: e.description,
      inLanguage: "en",
      dateModified: e.updated_at,
      publisher: org,
      primaryImageOfPage: { "@type": "ImageObject", contentUrl: abs(e.cover_image), caption: coverAlt(e) },
      image: e.photos.map((p, i) => ({ "@type": "ImageObject", contentUrl: abs(p.src), caption: photoAlt(e, p, i) })),
    },
    ...(e.event_date
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Event",
            name: e.title,
            description: e.description,
            startDate: e.event_date,
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            url,
            image: [abs(e.cover_image)],
            location: {
              "@type": "Restaurant",
              name: business.name,
              address: {
                "@type": "PostalAddress",
                streetAddress: business.street,
                addressLocality: business.locality,
                addressRegion: business.region,
                addressCountry: business.country,
              },
            },
            organizer: org,
          },
        ]
      : []),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        { "@type": "ListItem", position: 2, name: "Events", item: `${origin}/events` },
        { "@type": "ListItem", position: 3, name: e.title, item: url },
      ],
    },
  ];
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const [found, events, business] = await Promise.all([findEvent(slug), getEvents(), getBusinessInfo()]);
  if (!found) notFound();
  // The event moved to a new address: send visitors and Google there
  if (found.redirect) permanentRedirect(eventPath(found.event.slug));
  const e = found.event;
  const paragraphs = paragraphsOf(e.body);
  const photos = e.photos.map((p, i) => ({ src: p.src, alt: photoAlt(e, p, i) }));
  const others = events.filter((o) => o.id !== e.id).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output, with "<" escaped so text can't close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(e, business)).replace(/</g, "\\u003c") }}
      />
      <Navbar />
      <main className="min-h-screen bg-cream">
        <header className="relative overflow-hidden bg-navy pb-14 pt-32 text-white md:pb-20 md:pt-44 short:pt-32">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(102,155,188,0.35),transparent_65%),radial-gradient(40rem_24rem_at_0%_110%,rgba(102,155,188,0.18),transparent_60%)]"
          />
          <div className="relative grid gap-10 px-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center md:px-20 lg:gap-16">
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="mb-5 md:mb-7">
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 py-1 text-[11px] font-bold uppercase tracking-[3px] text-ocean-light transition-colors hover:text-white"
                >
                  <ArrowLeft size={14} aria-hidden /> Events
                </Link>
              </nav>
              {e.tag && (
                <span className="mb-5 inline-block rounded-full border border-white/25 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[2px] text-cream">
                  {e.tag}
                </span>
              )}
              <h1 className="font-playfair text-[clamp(32px,4.8vw,64px)] font-bold leading-[1.08] text-balance break-words">{e.title}</h1>
              {e.description && <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-white/80 md:text-[18px]">{e.description}</p>}
              {(e.event_date || photos.length > 0) && (
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/80">
                  {e.event_date && (
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={15} className="text-ocean-light" aria-hidden />{" "}
                      <time dateTime={e.event_date}>{eventDateText(e.event_date)}</time>
                    </span>
                  )}
                  {photos.length > 0 && (
                    <a href="#photos" className="inline-flex items-center gap-2 py-1 underline-offset-4 hover:underline">
                      <Images size={15} className="text-ocean-light" aria-hidden /> {photos.length} {photos.length === 1 ? "photo" : "photos"}
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-[1.75rem] shadow-2xl ring-1 ring-white/15 md:mr-0 md:max-w-[420px]">
              <Image src={e.cover_image} alt={coverAlt(e)} fill preload sizes="(min-width: 768px) 420px, 300px" className="object-cover" />
            </div>
          </div>
        </header>

        {paragraphs.length > 0 && (
          <section aria-label="About this event" className="px-8 pt-14 md:px-20 md:pt-20">
            <div className="max-w-3xl space-y-5 text-[17px] font-normal leading-[1.75] text-navy/85">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line break-words">
                  {p}
                </p>
              ))}
            </div>
          </section>
        )}

        {photos.length > 0 && (
          <section id="photos" aria-labelledby="photos-title" className="scroll-mt-24 px-8 pt-14 md:px-20 md:pt-20">
            <h2 id="photos-title" className="mb-7 font-playfair text-3xl font-bold text-navy md:mb-10 md:text-4xl">
              Photos
            </h2>
            <EventGallery photos={photos} title={e.title} />
          </section>
        )}

        <section aria-label="Visit us" className="flex flex-col gap-3 px-8 py-14 sm:flex-row sm:justify-center md:px-20 md:py-20">
          <Link
            href="/book"
            className="inline-flex items-center justify-center rounded-full bg-navy px-7 py-4 text-[11px] font-bold uppercase tracking-[2px] text-cream transition-colors hover:bg-ocean hover:text-navy"
          >
            Book a table
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-full border border-navy/30 px-7 py-4 text-[11px] font-bold uppercase tracking-[2px] text-navy transition-colors hover:bg-navy hover:text-cream"
          >
            All events
          </Link>
        </section>

        {others.length > 0 && (
          <section aria-labelledby="more-events" className="px-8 pb-16 md:px-20 md:pb-24">
            <h2 id="more-events" className="mb-7 font-playfair text-3xl font-bold text-navy md:mb-10 md:text-4xl">
              More events
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o) => (
                <Link key={o.id} href={eventPath(o.slug)} className="group flex flex-col gap-4">
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-navy/10">
                    <Image
                      src={o.cover_image}
                      alt={coverAlt(o)}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
                    />
                  </span>
                  <span className="inline-flex items-center gap-3 font-playfair text-xl font-bold text-navy">
                    {o.title} <ArrowRight size={16} aria-hidden className="shrink-0 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
