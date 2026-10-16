"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, Camera } from "lucide-react";
import Link from "next/link";
import { useSection } from "@/context/ContentContext";
import { Heading } from "@/components/ContentText";

export default function EventsPage() {
  const hero = useSection("events_hero");
  const list = useSection("events_list");
  const galleries = useSection("events_gallery");
  const upcomingEvents = list.items;
  const pastGalleries = galleries.items;

  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen">

        {/* Hero Section */}
        <section className="relative pt-44 pb-24 px-8 md:px-20 bg-navy text-white overflow-hidden">
          <div className="absolute inset-0">
            <img src={hero.fields.image} alt={hero.fields.image_alt} className="w-full h-full object-cover opacity-40" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent"></div>
        
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

        {/* Upcoming Events */}
        <section className="py-24 px-8 md:px-20">
          <div className="mb-16">
            <span className="text-[9px] tracking-[4px] uppercase text-ocean font-bold block mb-4">{list.fields.eyebrow}</span>
            <h2 className="font-playfair text-4xl md:text-5xl font-bold text-navy">{list.fields.title}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {upcomingEvents.map((event, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="group flex flex-col"
              >
                <div className="relative aspect-[4/5] overflow-hidden mb-8 rounded-sm">
                  <img src={event.image} alt={event.alt || event.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute top-6 left-6 bg-navy/90 backdrop-blur-md px-4 py-2 rounded-full">
                    <span className="text-[8px] tracking-[2px] uppercase text-cream font-bold">{event.tag}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-[10px] tracking-[2px] uppercase text-ocean font-bold">
                    <Calendar size={14} /> {event.date}
                  </div>
                  <h3 className="font-playfair text-2xl font-bold text-navy">{event.title}</h3>
                  <p className="text-[14px] leading-relaxed text-navy/70 font-light italic">&ldquo;{event.description}&rdquo;</p>
                  <Link href={list.fields.cta_link} className="group/btn inline-flex items-center gap-3 text-[10px] tracking-[3px] uppercase text-navy font-bold mt-4">
                    {list.fields.cta} <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Event Galleries */}
        <section className="py-24 px-8 md:px-20 bg-navy text-white overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-6">
                <Camera size={16} /> {galleries.fields.eyebrow}
              </span>
              <h2 className="font-playfair text-[clamp(40px,5vw,72px)] font-bold text-white leading-none">
                <Heading c={galleries} emClassName="italic text-ocean" />
              </h2>
            </motion.div>
          
            <motion.p
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-md text-right text-white/60 font-light text-[15px]"
            >
              {galleries.fields.body}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pastGalleries.map((gallery, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="group relative aspect-square overflow-hidden rounded-sm cursor-pointer"
              >
                <img src={gallery.image} alt={gallery.alt || gallery.title} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                <div className="absolute inset-0 flex flex-col justify-end p-8 translate-y-4 group-hover:translate-y-0 transition-transform">
                  <span className="text-[8px] tracking-[3px] uppercase text-ocean font-bold mb-2">{gallery.count}</span>
                  <h3 className="font-playfair text-xl font-bold text-white">{gallery.title}</h3>
                </div>
              </motion.article>
            ))}
          </div>

          <div className="mt-20 text-center">
            <Link
              href={galleries.fields.cta_link}
              className="group relative bg-ocean text-navy rounded-lg py-5 px-14 font-jost max-md:whitespace-nowrap max-md:px-8 text-[10px] font-bold tracking-[3px] uppercase no-underline inline-block transition-all duration-500 overflow-hidden shadow-2xl hover:bg-white"
            >
              {galleries.fields.cta}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
