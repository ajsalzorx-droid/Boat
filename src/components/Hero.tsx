"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-40 overflow-hidden bg-ink">

      {/* ── Full-screen video background ── */}
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/images/custom/hero_waterfront_dubai_1777327086914.png"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/hero.mp4" type="video/mp4" />
        {/* Fallback image if video fails */}
        <img
          src="/images/custom/hero_waterfront_dubai_1777327086914.png"
          alt="Hero Background"
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
            Est. 2021 · Waterfront Market · Dubai, UAE
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-playfair text-[clamp(30px,4vw,56px)] font-bold leading-[0.98] text-white mb-6 drop-shadow-xl"
        >
          Where the<br />Ocean Meets<br />
          <em className="italic text-ocean block font-semibold">the City.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-[13px] font-medium leading-[2.0] text-white/80 max-w-[400px] mb-10 tracking-[0.2px]"
        >
          Seafood is not just food — it is an experience, a story, and a connection to the sea. Crafted daily at Dubai's finest waterfront.
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
            Order Online
          </Link>
          <a
            href="#loc"
            className="group flex items-center gap-3 text-white/80 text-[11px] tracking-[3px] uppercase max-md:whitespace-nowrap no-underline transition-colors font-bold hover:text-white"
          >
            Find Us
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.9 }}
        className="absolute right-12 bottom-18 flex-col items-center gap-3 hidden md:flex"
      >
        <div className="w-[1px] h-[64px] bg-white/20 relative overflow-hidden">
          <motion.div
            animate={{ top: ["-30px", "110%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-[32px] bg-white/60"
          ></motion.div>
        </div>
        <span className="[writing-mode:vertical-rl] text-[8.5px] tracking-[5px] uppercase text-white/50 font-bold">
          Scroll
        </span>
      </motion.div>
    </section>
  );
}
