"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSection } from "@/context/ContentContext";
import { cdnVideo } from "@/lib/cdn";
import { Heading } from "./ContentText";

export default function Hero() {
  const c = useSection("hero");
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-40 overflow-hidden bg-ink">

      {/* ── Full-screen video background ── */}
      <video
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        poster={c.fields.image}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={cdnVideo("/hero.mp4")} type="video/mp4" />
        {/* Fallback image if video fails */}
        <img
          src={c.fields.image}
          alt={c.fields.image_alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </video>

      {/* Overlays — keep video color rich, just darken for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"></div>

      {/* Content */}
      <div className="relative px-8 md:px-20 pb-20 md:pb-24 max-w-[860px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3.5 mb-6"
        >
          <div className="w-[38px] h-[1px] bg-white/50"></div>
          <span className="text-[8px] tracking-[4px] uppercase text-white/80 font-bold">
            {c.fields.eyebrow}
          </span>
        </motion.div>

        {/* Heading and intro stay visible from the first paint (only slide up): they are the page's
            main content for Google and its largest text, so they must not wait for JavaScript */}
        <motion.h1
          initial={{ y: 30 }}
          animate={{ y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-playfair text-[clamp(30px,4vw,56px)] font-bold leading-[0.98] text-white mb-6 drop-shadow-xl"
        >
          <Heading c={c} emClassName="italic text-ocean block font-semibold" />
        </motion.h1>

        <motion.p
          initial={{ y: 30 }}
          animate={{ y: 0 }}
          transition={{ duration: 1.1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-[13px] font-medium leading-[2.0] text-white/80 max-w-[400px] mb-10 tracking-[0.2px]"
        >
          {c.fields.body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center gap-6 md:gap-9"
        >
          <Link
            href="/menu"
            className="group relative bg-ocean text-navy rounded-lg py-[14px] px-[36px] md:px-[44px] font-jost max-md:whitespace-nowrap text-[11px] font-bold tracking-[2.5px] uppercase no-underline inline-block transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shadow-2xl hover:bg-white"
          >
            {c.fields.cta}
          </Link>
          <a
            href="#loc"
            className="group flex items-center gap-3 text-white/80 text-[11px] tracking-[3px] uppercase max-md:whitespace-nowrap no-underline transition-colors font-bold hover:text-white"
          >
            {c.fields.cta2}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
