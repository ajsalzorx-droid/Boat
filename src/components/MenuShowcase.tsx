"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

// Desktop grid is 4 columns x 2 rows = 8 cells: 2 tall cards (2 cells each) + 4 normal = 8
const SHOWCASE_SIZE = 6;
const TALL_POSITIONS = [0, 3];

export default function MenuShowcase() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchShowcase() {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }) // stable order when created_at ties
        .limit(SHOWCASE_SIZE * 3);

      if (data) {
        // Skip duplicate dishes (same name) so the grid shows 6 different items
        const seen = new Set<string>();
        const unique = data.filter((item) => {
          const key = item.name.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setMenuItems(unique.slice(0, SHOWCASE_SIZE).map((item, i) => ({
          ...item,
          image: item.image_url,
          // Layout is fixed by position so the 4x2 desktop grid is always filled exactly
          tall: TALL_POSITIONS.includes(i),
        })));
      }
    }
    fetchShowcase();
  }, []);

  return (
    <section className="bg-cream pt-12 pb-0" id="menu">

      <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr_1fr_1.35fr] md:grid-rows-[480px_310px] md:grid-flow-dense gap-[3px]">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`group relative overflow-hidden bg-cream aspect-[4/3] md:aspect-auto
              ${item.tall ? "md:row-span-2" : ""}
            `}
          >
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.09]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cream/90 via-cream/30 to-transparent opacity-95 transition-opacity duration-400 group-hover:opacity-100"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-[34px_30px] translate-y-1.5 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0">
              <span className="block text-[8px] tracking-[4px] uppercase text-navy/70 font-medium mb-2">
                {item.tag}
              </span>
              <div className="font-playfair text-[22px] font-semibold text-navy leading-[1.22] mb-2.5 whitespace-pre-line drop-shadow-sm">
                {item.name}
              </div>
              <div className="text-[11.5px] font-medium text-navy/70 leading-[1.85] max-h-0 overflow-hidden opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:max-h-[70px] group-hover:opacity-100">
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 38 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
        className="text-center p-[70px_60px_130px]"
      >
        <Link
          href="/menu"
          className="group inline-flex items-center gap-4 bg-navy text-cream rounded-lg py-4 px-10.5 font-jost text-[10px] font-bold max-md:whitespace-nowrap max-md:px-7 tracking-[3px] uppercase no-underline transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ocean hover:text-navy"
        >
          View Full Menu
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
        </Link>
      </motion.div>
    </section>
  );
}
