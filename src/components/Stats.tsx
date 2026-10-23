"use client";

import { motion } from "framer-motion";
import { useSection } from "@/context/ContentContext";

export default function Stats() {
  const c = useSection("stats");
  return (
    <section aria-label="Boat Seafood in numbers" className="bg-navy grid grid-cols-2 md:grid-cols-4">
      {c.items.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 38 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.95, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="group relative px-6 py-16 text-center border-r border-white/5 last:border-r-0 overflow-hidden cursor-default transition-colors duration-400 hover:bg-ocean-light/5"
        >
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ocean scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></div>
          
          <div className="font-playfair text-[56px] font-bold text-white leading-none mb-3">
            {stat.value}
            <b className="font-jost not-italic text-[24px] text-ocean align-super font-medium ml-1">
              {stat.symbol}
            </b>
          </div>
          <div className="text-[10px] tracking-[4px] uppercase text-white/50 font-bold">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </section>
  );
}
