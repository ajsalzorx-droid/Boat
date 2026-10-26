"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { MenuItem } from "@/data/menu";
import { useSection } from "@/context/ContentContext";
import { formatPrice, unitPrice } from "@/lib/offers";

// Desktop grid is 4 columns x 2 rows = 8 cells: 2 tall cards (2 cells each) + 4 normal = 8
const SHOWCASE_SIZE = 6;
const TALL_POSITIONS = [0, 3];

// `items` = active dishes, loaded on the server (src/lib/menu-data.ts) so they are in the HTML
export default function MenuShowcase({ items }: { items: MenuItem[] }) {
  const c = useSection("menu_showcase");

  // Skip duplicate dishes (same name) so the grid shows 6 different items
  const seen = new Set<string>();
  const menuItems = items
    .filter((item) => {
      const key = item.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, SHOWCASE_SIZE)
    .map((item, i) => ({
      ...item,
      // Layout is fixed by position so the 4x2 desktop grid is always filled exactly
      tall: TALL_POSITIONS.includes(i),
    }));

  return (
    <section className="bg-cream pt-12 pb-0" id="menu" aria-labelledby="menu-showcase-title">
      <h2 id="menu-showcase-title" className="sr-only">{c.fields.title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr_1fr_1.35fr] md:grid-rows-[480px_310px] md:grid-flow-dense gap-[3px]">
        {menuItems.map((item) => (
          <article
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
            {item.discount ? (
              <span className="absolute top-5 right-5 z-10 bg-offer text-white text-[11px] font-bold tracking-[1.5px] uppercase py-1.5 px-3 rounded-full shadow-lg">
                {item.discount}% Off
              </span>
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-cream/90 via-cream/30 to-transparent opacity-95 transition-opacity duration-400 group-hover:opacity-100"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-[34px_30px] translate-y-1.5 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0">
              <span className="block text-[8px] tracking-[4px] uppercase text-navy/70 font-medium mb-2">
                {item.tag}
              </span>
              <h3 className="font-playfair text-[22px] font-semibold text-navy leading-[1.22] mb-2.5 whitespace-pre-line drop-shadow-sm">
                {item.name}
              </h3>
              {/* Prices only for dishes on offer: the old one crossed out, then the offer price */}
              {item.discount ? (
                <p className="flex items-baseline gap-2.5 mb-2.5 font-jost">
                  <span className="text-[14px] font-medium text-navy/75 line-through decoration-2">AED {item.price}</span>
                  <span className="text-[18px] font-semibold text-offer">AED {formatPrice(unitPrice(item))}</span>
                </p>
              ) : null}
              <div className="text-[11.5px] font-medium text-navy/70 leading-[1.85] max-h-0 overflow-hidden opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:max-h-[70px] group-hover:opacity-100">
                {item.description}
              </div>
            </div>
          </article>
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
          {c.fields.cta}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
        </Link>
      </motion.div>
    </section>
  );
}
