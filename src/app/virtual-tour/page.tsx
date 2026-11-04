import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Tour360Viewer from "@/components/Tour360Viewer";
import { pageMetadata } from "@/lib/seo-data";

export const generateMetadata = () => pageMetadata("/virtual-tour");

const MAPS_LINK = "https://maps.app.goo.gl/95euDUMdJAWbSvK46";

// Full page 360° view of the restaurant: the view fills the screen under the navbar
export default function VirtualTourPage() {
  return (
    <>
      <Navbar />
      <main className="bg-ink">
        <section aria-labelledby="virtual-tour-title" className="pt-[92px] md:pt-[137px]">
          <h1 id="virtual-tour-title" className="sr-only">Virtual tour of Boat Seafood Restaurant, Waterfront Market, Dubai</h1>
          <Tour360Viewer className="w-full h-[calc(100svh-92px)] md:h-[calc(100svh-137px)] min-h-[380px] bg-navy" />
        </section>

        <section className="px-6 md:px-20 py-14 md:py-20 text-center">
          <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-semibold mb-4">
            <span className="w-8 h-[1px] bg-ocean" /> Virtual Tour <span className="w-8 h-[1px] bg-ocean" />
          </span>
          <h2 className="font-playfair text-[clamp(30px,4vw,52px)] font-bold text-white leading-tight mb-4">
            Like What You <span className="italic text-ocean">See?</span>
          </h2>
          <p className="text-white/60 text-[14px] max-w-xl mx-auto leading-relaxed mb-8">
            Find us on the waterfront at Waterfront Market, Deira. Reserve your table, or come and see it in person.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/book"
              className="group inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-ocean text-navy rounded-lg py-4 px-9 font-jost text-[11px] font-bold tracking-[2.5px] uppercase no-underline transition-colors hover:bg-white"
            >
              Book a Table
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
            </Link>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto border border-white/25 text-white rounded-lg py-4 px-9 font-jost text-[11px] font-bold tracking-[2.5px] uppercase no-underline transition-colors hover:bg-white hover:text-navy"
            >
              <MapPin size={16} /> Get Directions
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
