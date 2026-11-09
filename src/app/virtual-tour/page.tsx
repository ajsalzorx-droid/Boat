import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Tour360Viewer from "@/components/Tour360Viewer";
import { pageMetadata } from "@/lib/seo-data";
import { TOUR_PUBLISHED } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("/virtual-tour");

// Full page 360° view of the restaurant: the view fills the screen under the navbar
export default function VirtualTourPage() {
  if (!TOUR_PUBLISHED) notFound(); // not published yet: see TOUR_PUBLISHED in src/lib/seo.ts
  return (
    <>
      <Navbar />
      <main className="bg-ink">
        <section aria-labelledby="virtual-tour-title" className="pt-[92px] md:pt-[137px]">
          <h1 id="virtual-tour-title" className="sr-only">360 view of Boat Seafood Restaurant, Waterfront Market, Dubai</h1>
          <Tour360Viewer className="w-full h-[calc(100svh-92px)] md:h-[calc(100svh-137px)] min-h-[380px] bg-navy" />
        </section>
      </main>
    </>
  );
}
