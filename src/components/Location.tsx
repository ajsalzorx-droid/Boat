"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPin, Clock, Phone } from "lucide-react";
import { useSection } from "@/context/ContentContext";
import { Heading, Lines } from "./ContentText";

export default function Location() {
  const c = useSection("location");
  return (
    <section className="bg-navy py-[108px] px-7 md:px-20 grid grid-cols-1 md:grid-cols-[1fr_1.25fr] gap-[90px] items-center" id="loc">
      <motion.div
        initial={{ opacity: 0, y: 38 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="inline-flex items-center gap-3.5 text-[9px] tracking-[5px] uppercase text-ocean-light font-normal mb-6.5">
          <span className="w-6.5 h-[1px] bg-ocean-light shrink-0"></span>
          {c.fields.eyebrow}
        </span>
        <h2 className="font-playfair font-normal leading-[1.07] text-white text-[clamp(30px,3.4vw,50px)] mb-9.5">
          <Heading c={c} emClassName="italic text-ocean-light" />
        </h2>

        <div className="flex flex-col gap-6.5 mb-12">
          <div className="grid grid-cols-[18px_1fr] gap-4.5 items-start">
            <MapPin className="w-3.5 h-3.5 text-ocean mt-1" strokeWidth={1.5} />
            <div>
              <div className="text-[8px] tracking-[3px] uppercase text-ocean-light mb-1.5 font-normal">{c.fields.address_label}</div>
              <address className="not-italic text-[13px] font-light text-white/50 leading-[1.75]">
                <Lines text={c.fields.address} />
              </address>
            </div>
          </div>
          <div className="grid grid-cols-[18px_1fr] gap-4.5 items-start">
            <Clock className="w-3.5 h-3.5 text-ocean mt-1" strokeWidth={1.5} />
            <div>
              <div className="text-[8px] tracking-[3px] uppercase text-ocean-light mb-1.5 font-normal">{c.fields.hours_label}</div>
              <div className="text-[13px] font-light text-white/50 leading-[1.75]">
                {c.fields.hours}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[18px_1fr] gap-4.5 items-start">
            <Phone className="w-3.5 h-3.5 text-ocean mt-1" strokeWidth={1.5} />
            <div>
              <div className="text-[8px] tracking-[3px] uppercase text-ocean-light mb-1.5 font-normal">{c.fields.phone_label}</div>
              <div className="text-[13px] font-light text-white/50 leading-[1.75]">
                {c.fields.phone}
              </div>
            </div>
          </div>
        </div>

        <a
          href="https://maps.app.goo.gl/95euDUMdJAWbSvK46"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3.5 border border-ocean-light/50 rounded-lg text-ocean-light py-[15px] px-10 font-jost max-md:whitespace-nowrap max-md:px-7 text-[10px] font-light tracking-[3px] uppercase no-underline transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ocean hover:text-navy hover:border-ocean"
        >
          {c.fields.cta}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 38 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.95, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-[440px] overflow-hidden"
      >
        <iframe
          src="https://www.google.com/maps?q=BOAT+Seafood+Restaurant,+Waterfront+Market,+Deira,+Dubai&output=embed"
          title="Map: Boat Seafood at Waterfront Market, Deira, Dubai"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="w-full h-full border-none invert-[0.9] hue-rotate-[198deg] saturate-30 brightness-[0.58]"
        ></iframe>
        <div className="absolute inset-0 border border-ocean-light/20 pointer-events-none"></div>
        <div className="absolute bottom-4.5 left-4.5 bg-ink/90 backdrop-blur-[10px] border border-ocean-light/20 py-3.5 px-5 text-white font-jost text-xs font-light">
          <strong className="text-ocean-light block text-[8px] tracking-[3px] uppercase mb-1 font-normal">
            {c.fields.map_label}
          </strong>
          {c.fields.map_text}
        </div>
      </motion.div>
    </section>
  );
}
