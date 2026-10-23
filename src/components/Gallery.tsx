"use client";

import { motion } from "framer-motion";
import { useSection } from "@/context/ContentContext";

export default function Gallery() {
  const c = useSection("gallery");
  const images = c.items.filter((item) => item.image);
  // Duplicate images for infinite scroll on mobile
  const mobileImages = [...images, ...images];

  return (
    <section aria-label="Photo gallery" className="bg-navy overflow-hidden">
      {/* Mobile Auto-Scroll (Ticker style) */}
      <div className="md:hidden">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: [0, "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 15,
          }}
        >
          {mobileImages.map((photo, i) => (
            <div key={i} aria-hidden={i >= images.length || undefined} className="relative w-1/3 shrink-0 aspect-[3/5] overflow-hidden">
              <img
                src={photo.image}
                alt={i >= images.length ? "" : photo.alt}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-ink/10"></div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Desktop Grid (Original) */}
      <div className="hidden md:grid grid-cols-6 h-[320px] gap-[3px]">
        {images.map((photo, i) => (
          <div key={i} className="relative overflow-hidden group">
            <img
              src={photo.image}
              alt={photo.alt}
              loading="lazy"
              className="w-full h-full object-cover transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-ink/10 transition-colors duration-400 group-hover:bg-ink/30"></div>
          </div>
        ))}
      </div>
    </section>
  );
}
