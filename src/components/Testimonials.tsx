"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";



const testimonials = [
  {
    name: "James Harrington",
    role: "Food Critic",
    content: "The freshest seafood in Dubai, period. The Mediterranean Sea Bass was perfectly roasted, preserving the delicate flavors of the ocean.",
    rating: 5,
  },
  {
    name: "Sarah Al-Maktoum",
    role: "Regular Guest",
    content: "Boat Seafood has become our weekly tradition. The atmosphere at the Waterfront Market combined with five-star service is unmatched.",
    rating: 5,
  },
  {
    name: "Marcus Vane",
    role: "International Traveler",
    content: "An authentic culinary journey. You can taste the freshness in every bite. The signature platter is a masterpiece of textures and tastes.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="bg-navy py-32 px-8 md:px-20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,50 Q25,25 50,50 T100,50" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0,60 Q25,35 50,60 T100,60" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0,70 Q25,45 50,70 T100,70" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative z-10 text-center mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-6">
            Guest Experiences
          </span>
          <h2 className="font-playfair text-[clamp(36px,4.5vw,64px)] font-bold text-white leading-tight">
            Loved by Connoisseurs,<br />
            <em className="italic text-ocean">Cherished by Locals.</em>
          </h2>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className="bg-white/[0.03] border border-white/5 p-12 flex flex-col items-center text-center group transition-all duration-500 hover:bg-white/[0.06] hover:border-ocean/20"
          >
            <Quote className="text-ocean mb-8 opacity-40 group-hover:opacity-100 transition-opacity" size={32} />
            <div className="flex gap-1 mb-8">
              {[...Array(t.rating)].map((_, i) => (
                <Star key={i} size={12} className="fill-ocean text-ocean" />
              ))}
            </div>
            <p className="text-[16px] leading-[1.8] text-white/70 font-light italic mb-10 flex-grow">
              "{t.content}"
            </p>
            <div>
              <h4 className="font-playfair text-xl font-bold text-white mb-1">{t.name}</h4>
              <span className="text-[10px] tracking-[3px] uppercase text-white/30 font-bold">{t.role}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
