"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSection } from "@/context/ContentContext";
import { Heading, StyledHeading } from "@/components/ContentText";
import EventCards from "@/components/EventCards";
import type { EventCard } from "@/lib/events";

export default function EventsClient({ events }: { events: EventCard[] }) {
  const hero = useSection("events_hero");
  const list = useSection("events_list");

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
              <StyledHeading as="h1" choice={hero.fields.title_style} className="font-playfair text-[clamp(40px,6vw,84px)] font-bold leading-none mb-6">
                <Heading c={hero} emClassName="italic text-ocean" />
              </StyledHeading>
              <p className="text-[15px] text-white/60 max-w-xl leading-relaxed font-light">
                {hero.fields.body}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Special events, added in Admin -> Events; each opens its own page */}
        <section className="px-8 py-16 md:px-20 md:py-24">
          {events.length > 0 && (
            <>
              <div className="mb-10 md:mb-16">
                <span className="text-[9px] tracking-[4px] uppercase text-ocean font-bold block mb-4">{list.fields.eyebrow}</span>
                <StyledHeading as="h2" choice={list.fields.title_style} className="font-playfair text-4xl md:text-5xl font-bold text-navy">{list.fields.title}</StyledHeading>
              </div>
              <EventCards events={events} />
            </>
          )}
          <div className={events.length > 0 ? "mt-16 text-center md:mt-20" : "text-center"}>
            <Link
              href={list.fields.cta_link}
              className="inline-block rounded-lg bg-navy px-10 py-5 font-jost text-[10px] font-bold uppercase tracking-[3px] text-cream no-underline transition-colors duration-500 hover:bg-ocean hover:text-navy"
            >
              {list.fields.cta}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
