import Tour360Viewer from "@/components/Tour360Viewer";

// Homepage section with the 360° view; the full page is /virtual-tour
export default function Tour360() {
  return (
    <section className="bg-ink py-20 md:py-28 px-6 md:px-20" aria-labelledby="tour-title">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-semibold mb-4">
            <span className="w-8 h-[1px] bg-ocean" /> Virtual Tour <span className="w-8 h-[1px] bg-ocean" />
          </span>
          <h2 id="tour-title" className="font-playfair text-[clamp(30px,4vw,52px)] font-bold text-white leading-tight">
            Take a <span className="italic text-ocean">360°</span> Look Around
          </h2>
          <p className="text-white/60 text-[14px] mt-3">Drag to explore our entrance at Waterfront Market, Deira.</p>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-navy">
          <Tour360Viewer className="w-full h-[60svh] min-h-[340px] max-h-[640px]" />
        </div>
      </div>
    </section>
  );
}
