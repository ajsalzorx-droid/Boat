"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSection } from "@/context/ContentContext";
import { Heading } from "./ContentText";

export default function Origin() {
  const c = useSection("origin");
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 min-h-[90vh]">
      <div className="relative overflow-hidden bg-ink min-h-[400px]">
        <img src={c.fields.image} alt={c.fields.image_alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy/30 to-transparent"></div>
      </div>

      <div className="flex flex-col justify-center py-24 px-12 md:px-24 bg-cream">
        <motion.div
          initial={{ opacity: 0, y: 38 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-3.5 text-[9px] tracking-[5px] uppercase text-ocean font-normal mb-6.5">
            <span className="w-6.5 h-[1px] bg-ocean shrink-0"></span>
            {c.fields.eyebrow}
          </span>
          <h2 className="font-playfair font-normal leading-[1.07] text-navy text-[clamp(34px,3.8vw,58px)] mb-7.5">
            <Heading c={c} emClassName="italic text-ocean" />
          </h2>
          <p className="text-[16px] leading-[2.1] text-navy/90 font-light max-w-[400px] mb-12">
            {c.fields.body}
          </p>
          <a
            href="#exp"
            className="group inline-flex items-center gap-4 bg-navy text-cream rounded-lg py-4 px-10.5 font-jost text-[10px] font-light max-md:whitespace-nowrap max-md:px-7 tracking-[3px] uppercase no-underline transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ocean hover:text-navy"
          >
            {c.fields.cta}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
