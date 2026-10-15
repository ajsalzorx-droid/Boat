"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, Camera } from "lucide-react";
import Link from "next/link";

const upcomingEvents = [
  {
    title: "Friday Lobster Night",
    date: "Every Friday · 7:00 PM",
    description: "Indulge in our signature butter-poached lobster, served with seasonal sides and premium pairings.",
    image: "https://images.pexels.com/photos/11054363/pexels-photo-11054363.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    tag: "Weekly Special"
  },
  {
    title: "Monthly Chef's Table",
    date: "Last Saturday of the Month",
    description: "An exclusive 7-course tasting journey through the ocean's rarest treasures, guided by our Head Chef.",
    image: "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    tag: "Exclusive"
  },
  {
    title: "Seafood Festival 2024",
    date: "Coming Soon · Nov 15-20",
    description: "A celebration of coastal flavors featuring live music, outdoor grilling, and the city's largest seafood platter.",
    image: "https://images.pexels.com/photos/20814983/pexels-photo-20814983/free-photo-of-steaming-seafood-bowl.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    tag: "Festival"
  }
];

const pastGalleries = [
  {
    title: "Grand Opening Gala",
    count: "24 Photos",
    image: "https://images.pexels.com/photos/1683545/pexels-photo-1683545.jpeg?auto=compress&cs=tinysrgb&w=800&q=80"
  },
  {
    title: "Corporate Seafood Dinner",
    count: "18 Photos",
    image: "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800&q=80"
  },
  {
    title: "Private Yacht Catering",
    count: "12 Photos",
    image: "https://images.pexels.com/photos/331107/pexels-photo-331107.jpeg?auto=compress&cs=tinysrgb&w=800&q=80"
  },
  {
    title: "Birthday Celebration",
    count: "32 Photos",
    image: "https://images.pexels.com/photos/10368144/pexels-photo-10368144.jpeg?auto=compress&cs=tinysrgb&w=800&q=80"
  }
];

export default function EventsPage() {
  return (
    <main className="bg-cream min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-44 pb-24 px-8 md:px-20 bg-navy text-white overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.pexels.com/photos/331107/pexels-photo-331107.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Events" className="w-full h-full object-cover opacity-40" />
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
              Events & Gatherings
            </span>
            <h1 className="font-playfair text-[clamp(40px,6vw,84px)] font-bold leading-none mb-6">
              Unforgettable <em className="italic text-ocean">Moments</em>
            </h1>
            <p className="text-[15px] text-white/60 max-w-xl leading-relaxed font-light">
              From intimate private dinners to festive celebrations, Boat Seafood provides the perfect waterfront backdrop for your special occasions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-24 px-8 md:px-20">
        <div className="mb-16">
          <span className="text-[9px] tracking-[4px] uppercase text-ocean font-bold block mb-4">Upcoming</span>
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-navy">Special Events</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {upcomingEvents.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="group flex flex-col"
            >
              <div className="relative aspect-[4/5] overflow-hidden mb-8 rounded-sm">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute top-6 left-6 bg-navy/90 backdrop-blur-md px-4 py-2 rounded-full">
                  <span className="text-[8px] tracking-[2px] uppercase text-cream font-bold">{event.tag}</span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[10px] tracking-[2px] uppercase text-ocean font-bold">
                  <Calendar size={14} /> {event.date}
                </div>
                <h3 className="font-playfair text-2xl font-bold text-navy">{event.title}</h3>
                <p className="text-[14px] leading-relaxed text-navy/70 font-light italic">"{event.description}"</p>
                <Link href="https://wa.me/971500000000" className="group/btn inline-flex items-center gap-3 text-[10px] tracking-[3px] uppercase text-navy font-bold mt-4">
                  Inquire Now <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </div>
            </motion.div>
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
              <Camera size={16} /> Past Memories
            </span>
            <h2 className="font-playfair text-[clamp(40px,5vw,72px)] font-bold text-white leading-none">
              Event <em className="italic text-ocean">Galleries</em>
            </h2>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-md text-right text-white/60 font-light text-[15px]"
          >
            A glimpse into the celebrations and experiences we've hosted at Boat Seafood.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pastGalleries.map((gallery, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="group relative aspect-square overflow-hidden rounded-sm cursor-pointer"
            >
              <img src={gallery.image} alt={gallery.title} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
              <div className="absolute inset-0 flex flex-col justify-end p-8 translate-y-4 group-hover:translate-y-0 transition-transform">
                <span className="text-[8px] tracking-[3px] uppercase text-ocean font-bold mb-2">{gallery.count}</span>
                <h4 className="font-playfair text-xl font-bold text-white">{gallery.title}</h4>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <Link
            href="https://wa.me/971500000000"
            className="group relative bg-ocean text-navy rounded-lg py-5 px-14 font-jost max-md:whitespace-nowrap max-md:px-8 text-[10px] font-bold tracking-[3px] uppercase no-underline inline-block transition-all duration-500 overflow-hidden shadow-2xl hover:bg-white"
          >
            Book Your Event
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
