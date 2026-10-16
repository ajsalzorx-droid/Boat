import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import Origin from "@/components/Origin";
import Stats from "@/components/Stats";
import MenuShowcase from "@/components/MenuShowcase";
import DailyCatch from "@/components/DailyCatch";
import Experience from "@/components/Experience";
import Testimonials from "@/components/Testimonials";
import Gallery from "@/components/Gallery";
import Location from "@/components/Location";
import Footer from "@/components/Footer";
import { getBusinessInfo, pageMetadata, restaurantJsonLd } from "@/lib/seo";
import { getSiteContent } from "@/lib/content";
import { getActiveMenuItems, getAvailableCatch } from "@/lib/menu-data";
import { Heading } from "@/components/ContentText";

export const generateMetadata = () => pageMetadata("/");

export default async function Home() {
  const [business, content, menuItems, dailyCatch] = await Promise.all([
    getBusinessInfo(),
    getSiteContent(),
    getActiveMenuItems(),
    getAvailableCatch(),
  ]);
  const { manifesto, visit } = content;

  return (
    <>
      <Navbar />
      <main>
        {/* Restaurant details for Google (address, hours, phone) - edited in the SEO Studio (/seo) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(restaurantJsonLd(business)).replace(/</g, "\\u003c"),
          }}
        />
        <Hero />
        <Ticker />
        <Origin />
        <Stats />
        <DailyCatch items={dailyCatch} />
      
        {/* Manifesto Section — editorial split layout */}
        <section aria-label="Brand manifesto" className="grid grid-cols-1 md:grid-cols-2 min-h-[80vh]">
          {/* Left: full-color image, no overlay */}
          <div className="relative overflow-hidden min-h-[420px]">
            <img
              src={manifesto.fields.image}
              alt={manifesto.fields.image_alt}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover scale-[1.04] hover:scale-100 transition-transform duration-[2s] ease-out"
            />
            {/* Subtle left-edge gradient so the panel blend is seamless */}
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#001a24] to-transparent hidden md:block"></div>
          </div>

          {/* Right: dark panel with editorial quote */}
          <figure className="bg-[#001a24] flex flex-col justify-center px-12 md:px-16 py-20">
            <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-semibold mb-8">
              <span className="w-8 h-[1px] bg-ocean shrink-0"></span>
              {manifesto.fields.eyebrow}
            </span>
            <blockquote className="font-cormorant italic text-[clamp(28px,3.5vw,52px)] font-bold text-white leading-[1.35] mb-8">
              &ldquo;<Heading c={manifesto} emClassName="not-italic text-ocean" />&rdquo;
            </blockquote>
            <figcaption className="text-[11px] tracking-[3px] uppercase text-white/50 font-semibold not-italic">
              {manifesto.fields.cite}
            </figcaption>
          </figure>
        </section>

        <MenuShowcase items={menuItems} />
        <Experience />
        <Gallery />
        <Testimonials />

        {/* Come Dine With Us — walk-in section */}
        <section className="relative min-h-[92vh] overflow-hidden flex items-center justify-center group">
          {/* Background photo — full color */}
          <img
            src={visit.fields.image}
            alt={visit.fields.image_alt}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover scale-[1.04] transition-transform duration-[16s] ease-linear group-hover:scale-[1.08]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/30 to-black/45"></div>

          <div className="relative w-full max-w-[560px] mx-6">

            {/* Open Now badge */}
            <div className="flex justify-center mb-7">
              <span className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-full text-[11px] font-semibold tracking-[2px] uppercase text-white/90">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ade80]"></span>
                </span>
                {visit.fields.badge}
              </span>
            </div>

            {/* Headline */}
            <div className="text-center mb-9">
              <p className="text-[11px] tracking-[6px] uppercase text-ocean font-semibold mb-3">{visit.fields.eyebrow}</p>
              <h2 className="font-playfair text-[clamp(38px,5vw,68px)] font-bold text-white leading-[1.05] drop-shadow-xl">
                <Heading c={visit} emClassName="italic text-ocean" />
              </h2>
            </div>

            {/* Glass info card */}
            <div className="bg-black/50 backdrop-blur-xl border border-white/25 rounded-2xl p-7 shadow-2xl">

              {/* 3 info rows */}
              <div className="flex flex-col divide-y divide-white/10 mb-6">
                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-ocean/20 border border-ocean/30 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5ba4c4" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[3px] uppercase text-ocean font-bold mb-1">{visit.fields.hours_label}</p>
                    <p className="text-white text-base font-semibold">{visit.fields.hours}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-ocean/20 border border-ocean/30 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5ba4c4" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[3px] uppercase text-ocean font-bold mb-1">{visit.fields.address_label}</p>
                    <p className="text-white text-base font-semibold">{visit.fields.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-ocean/20 border border-ocean/30 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5ba4c4" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[3px] uppercase text-ocean font-bold mb-1">{visit.fields.seating_label}</p>
                    <p className="text-white text-base font-semibold">{visit.fields.seating}</p>
                  </div>
                </div>
              </div>

              {/* Dual CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://wa.me/971500000000?text=Hello%2C%20I%20have%20a%20question%20about%20Boat%20Seafood"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2.5 bg-[#25D366] text-white py-4 rounded-lg font-jost text-[11px] font-bold tracking-[2px] uppercase no-underline transition-all duration-300 hover:bg-white hover:text-[#25D366]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  {visit.fields.cta}
                </a>
                <a
                  href="https://www.google.com/maps?vet=10CAAQoqAOahcKEwjYxrvuv5iUAxUAAAAAHQAAAAAQBQ..i&pvq=Cg0vZy8xMXcyZmRna2QyIlYKUEJPQVQgU0VBRk9PRCBSRVNUQVVSQU5UIC_Zhdi32LnZhSDYp9mE2YXYsdmD2Kgg2YTZhNmF2KLZg9mI2YTYp9iqINin2YTYqNit2LHZitipEAIYAw&lqi=ClBCT0FUIFNFQUZPT0QgUkVTVEFVUkFOVCAv2YXYt9i52YUg2KfZhNmF2LHZg9ioINmE2YTZhdii2YPZiNmE2KfYqiDYp9mE2KjYrdix2YrYqUiCi53WibuAgAhafRAAEAEQAhADEAQQBRAGGAAYARgCGAMYBBgFGAYiT2JvYXQgc2VhZm9vZCByZXN0YXVyYW50INmF2LfYudmFINin2YTZhdix2YPYqCDZhNmE2YXYotmD2YjZhNin2Kog2KfZhNio2K3YsdmK2KkqDggCEAAQARACEAQQBRAGkgESc2VhZm9vZF9yZXN0YXVyYW50mgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDI1YWQxVkZiRXhqZW1oSFpETnNTV05XWkZaYVZGcHVZVEZzVDJSWVl4QUL6AQQIABBK&fvr=1&cs=0&um=1&ie=UTF-8&fb=1&gl=ae&sa=X&geocode=KQ2ydF9RW18-MWmWtPuHlIzY&daddr=Waterfront+-+Daira+-+Corniche+Deira+-+Deira+-+Dubai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2.5 bg-ocean text-navy py-4 rounded-lg font-jost text-[11px] font-bold tracking-[2px] uppercase no-underline transition-all duration-300 hover:bg-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="whitespace-nowrap">{visit.fields.cta2}</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <Location />
      </main>
      <Footer />
    </>
  );
}
