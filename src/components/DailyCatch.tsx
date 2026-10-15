"use client";

import { motion } from "framer-motion";
import { ArrowRight, Waves } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function DailyCatch() {
  const [dailyCatch, setDailyCatch] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCatch() {
      const { data } = await supabase.from('daily_catch').select('*').eq('is_available', true).order('updated_at', { ascending: false });
      if (data) setDailyCatch(data);
    }
    fetchCatch();
  }, []);

  return (
    <section className="bg-cream py-32 px-8 md:px-20 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-20 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-6">
            <Waves size={16} /> Fresh From the Market
          </span>
          <h2 className="font-playfair text-[clamp(40px,5vw,72px)] font-bold text-navy leading-none">
            Today's <em className="italic text-ocean">Catch</em>
          </h2>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-md text-left md:text-right"
        >
          <p className="text-[16px] leading-relaxed text-navy/85 font-light mb-8">
            Our selection changes every morning based on what the ocean provides. 
            Hand-picked at the Waterfront Market at dawn.
          </p>
          <Link href="/menu" className="group hidden md:inline-flex items-center gap-3 text-[10px] tracking-[3px] uppercase text-navy font-bold transition-colors hover:text-ocean">
            View Market Menu <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 md:gap-12">
        {dailyCatch.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className={`group cursor-default ${i >= 4 ? "hidden md:block" : ""}`}
          >
            <div className="relative aspect-[3/4] overflow-hidden mb-4 md:mb-8 rounded-sm">
              <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 bg-navy/10 group-hover:bg-navy/0 transition-colors duration-500"></div>
              <div className="absolute top-2 left-2 md:top-6 md:left-6 bg-white/90 backdrop-blur-md px-2.5 py-1 md:px-4 md:py-2 rounded-full">
                <span className="text-[8px] tracking-[2px] uppercase text-navy font-bold">AED {item.price}</span>
              </div>
            </div>
            <div className="flex flex-col items-center text-center px-1 md:px-4">
              <span className="text-[8px] md:text-[9px] tracking-[2px] md:tracking-[4px] uppercase text-ocean font-bold mb-2 md:mb-3">{item.origin}</span>
              <h3 className="font-playfair text-base md:text-2xl font-bold text-navy mb-2 md:mb-4 leading-tight md:leading-normal">{item.name}</h3>
              <p className="text-[12px] md:text-[14px] leading-relaxed text-navy/80 font-light italic line-clamp-2 md:line-clamp-none">"{item.description}"</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile only: button after the images (desktop keeps the link in the header) */}
      <div className="mt-12 flex justify-center md:hidden">
        <Link href="/menu" className="group inline-flex items-center gap-3 bg-navy text-cream rounded-lg px-8 py-4 text-[10px] whitespace-nowrap tracking-[3px] uppercase font-bold transition-colors hover:bg-ocean hover:text-navy">
          View Market Menu <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
