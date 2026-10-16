"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Tag, Clock, ArrowRight, Gift, Percent } from "lucide-react";
import Link from "next/link";
import { useSection } from "@/context/ContentContext";
import { Heading } from "@/components/ContentText";

// Icons stay fixed by position; the text comes from the SEO Studio
const perkIcons = [Gift, Percent, Clock];

export default function OfferPage() {
  const hero = useSection("offers_hero");
  const list = useSection("offers_list");
  const perks = useSection("offers_perks");
  const currentOffers = list.items;
  const memberPerks = perks.items.map((perk, i) => {
    const Icon = perkIcons[i % perkIcons.length];
    return { title: perk.title, description: perk.description, icon: <Icon className="w-6 h-6" /> };
  });

  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen">

        {/* Hero Section */}
        <section className="relative pt-44 pb-24 px-8 md:px-20 bg-navy text-white overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={hero.fields.image}
              alt={hero.fields.image_alt}
              className="w-full h-full object-cover opacity-30 scale-110" 
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent"></div>
        
          <div className="relative z-10 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-3.5 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-6">
                <span className="w-8 h-[1px] bg-ocean shrink-0"></span>
                {hero.fields.eyebrow}
              </span>
              <h1 className="font-playfair text-[clamp(40px,6vw,84px)] font-bold leading-none mb-6">
                <Heading c={hero} emClassName="italic text-ocean" />
              </h1>
              <p className="text-[15px] text-white/60 max-w-xl leading-relaxed font-light">
                {hero.fields.body}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Featured Offers */}
        <section className="py-24 px-8 md:px-20">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <span className="text-[9px] tracking-[4px] uppercase text-ocean font-bold block mb-4">{list.fields.eyebrow}</span>
              <h2 className="font-playfair text-4xl md:text-5xl font-bold text-navy">{list.fields.title}</h2>
            </div>
            <div className="hidden md:block w-24 h-[1px] bg-navy/10 mb-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {currentOffers.map((offer, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="group flex flex-col h-full"
              >
                <div className="relative aspect-[4/5] overflow-hidden mb-8 rounded-sm shadow-xl">
                  <img src={offer.image} alt={offer.alt || offer.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute top-6 left-6 bg-navy/90 backdrop-blur-md px-5 py-2 rounded-full border border-white/10">
                    <span className="text-[8px] tracking-[2px] uppercase text-cream font-bold">{offer.tag}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 flex-grow">
                  <span className="text-[10px] tracking-[2px] uppercase text-ocean font-bold flex items-center gap-2">
                    <Tag size={12} /> {offer.subtitle}
                  </span>
                  <h3 className="font-playfair text-2xl font-bold text-navy">{offer.title}</h3>
                  <p className="text-[14px] leading-relaxed text-navy/70 font-light italic">&ldquo;{offer.description}&rdquo;</p>
                  <div className="mt-auto pt-6">
                    <Link href={offer.link || "/menu"} className="group/btn inline-flex items-center gap-3 text-[10px] tracking-[3px] uppercase text-navy font-bold">
                      {offer.cta} <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1 text-ocean" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Perks Section */}
        <section className="py-24 px-8 md:px-20 bg-navy text-white overflow-hidden relative">
          {/* Background elements */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-ocean/5 -skew-x-12 translate-x-20"></div>
        
          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <span className="text-[9px] tracking-[5px] uppercase text-ocean font-bold block mb-4">{perks.fields.eyebrow}</span>
              <h2 className="font-playfair text-4xl md:text-6xl font-bold text-white mb-6">{perks.fields.title}</h2>
              <p className="text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
                {perks.fields.body}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {memberPerks.map((perk, i) => (
                <motion.article
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-sm hover:border-ocean/30 transition-colors group text-center md:text-left"
                >
                  <div className="w-14 h-14 bg-ocean text-navy rounded-full flex items-center justify-center mb-8 mx-auto md:mx-0 group-hover:scale-110 transition-transform">
                    {perk.icon}
                  </div>
                  <h3 className="font-playfair text-2xl font-bold mb-4">{perk.title}</h3>
                  <p className="text-white/50 font-light text-[14px] leading-relaxed italic">
                    {perk.description}
                  </p>
                </motion.article>
              ))}
            </div>

            <div className="mt-24 text-center">
              <Link
                href={perks.fields.cta_link}
                className="group relative bg-white text-navy rounded-lg py-5 px-14 font-jost max-md:whitespace-nowrap max-md:px-8 text-[10px] font-bold tracking-[3px] uppercase no-underline inline-block transition-all duration-500 overflow-hidden shadow-2xl hover:bg-ocean"
              >
                {perks.fields.cta}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
