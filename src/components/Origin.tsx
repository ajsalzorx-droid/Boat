"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Origin() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 min-h-[90vh]">
      <div className="relative overflow-hidden bg-ink min-h-[400px]">
        {/* Fallback Image */}
        <img src="https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Origin Background" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
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
            Our Origin
          </span>
          <h2 className="font-playfair font-normal leading-[1.07] text-navy text-[clamp(34px,3.8vw,58px)] mb-7.5">
            A Story Written<br />by the <em className="italic text-ocean">Sea</em>
          </h2>
          <p className="text-[16px] leading-[2.1] text-navy/90 font-light max-w-[400px] mb-12">
            Born at the heart of Waterfront Market, Boat Seafood stands where the ocean meets the city, and where every catch has a journey. We are committed to serving only the freshest selections — carefully chosen, expertly prepared, and honestly presented. Because quality is not a promise. It is our standard.
          </p>
          <a
            href="#exp"
            className="group inline-flex items-center gap-4 bg-navy text-cream rounded-lg py-4 px-10.5 font-jost text-[10px] font-light max-md:whitespace-nowrap max-md:px-7 tracking-[3px] uppercase no-underline transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ocean hover:text-navy"
          >
            Our Experience
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
