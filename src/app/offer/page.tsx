"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Tag, Clock, ArrowRight, Gift, Percent } from "lucide-react";
import Link from "next/link";

const currentOffers = [
  {
    title: "Lunch Delight Menu",
    subtitle: "Weekdays Special",
    description: "Enjoy a curated 3-course seafood lunch featuring our daily catch, starting from AED 89. Perfect for business meetings or casual breaks.",
    image: "https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    tag: "12 PM - 4 PM",
    cta: "View Lunch Menu",
    link: "/menu"
  },
  {
    title: "Family Seafood Feast",
    subtitle: "Weekend Tradition",
    description: "Our signature jumbo platter featuring grilled prawns, calamari, mussels, and our catch of the day. Serves 4-6 people with side dishes.",
    image: "https://images.pexels.com/photos/331107/pexels-photo-331107.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    tag: "Weekend Only",
    cta: "Book a Table",
    link: "https://wa.me/971500000000"
  },
  {
    title: "Sunset Happy Hour",
    subtitle: "Daily Refreshment",
    description: "Buy one get one free on all signature mocktails and 20% off on appetizers while you watch the sunset over the waterfront.",
    image: "https://images.pexels.com/photos/11054363/pexels-photo-11054363.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    tag: "5 PM - 8 PM",
    cta: "Learn More",
    link: "https://wa.me/971500000000"
  }
];

const memberPerks = [
  {
    title: "Birthday Treat",
    description: "Complimentary dessert and a special birthday surprise when you celebrate your big day with us.",
    icon: <Gift className="w-6 h-6" />
  },
  {
    title: "Market Discount",
    description: "Show your Waterfront Market shopping receipt to get 10% off on your total bill.",
    icon: <Percent className="w-6 h-6" />
  },
  {
    title: "Priority Booking",
    description: "Skip the queue with priority table assignments during weekends and busy festival seasons.",
    icon: <Clock className="w-6 h-6" />
  }
];

export default function OfferPage() {
  return (
    <main className="bg-cream min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-44 pb-24 px-8 md:px-20 bg-navy text-white overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
            alt="Offers" 
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
              Exclusive Rewards
            </span>
            <h1 className="font-playfair text-[clamp(40px,6vw,84px)] font-bold leading-none mb-6">
              Taste the <em className="italic text-ocean">Savings</em>
            </h1>
            <p className="text-[15px] text-white/60 max-w-xl leading-relaxed font-light">
              Explore our range of seasonal promotions and daily specials designed to make your dining experience at Boat Seafood even more memorable.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Offers */}
      <section className="py-24 px-8 md:px-20">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <span className="text-[9px] tracking-[4px] uppercase text-ocean font-bold block mb-4">Limited Time</span>
            <h2 className="font-playfair text-4xl md:text-5xl font-bold text-navy">Special Promotions</h2>
          </div>
          <div className="hidden md:block w-24 h-[1px] bg-navy/10 mb-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {currentOffers.map((offer, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="group flex flex-col h-full"
            >
              <div className="relative aspect-[4/5] overflow-hidden mb-8 rounded-sm shadow-xl">
                <img src={offer.image} alt={offer.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute top-6 left-6 bg-navy/90 backdrop-blur-md px-5 py-2 rounded-full border border-white/10">
                  <span className="text-[8px] tracking-[2px] uppercase text-cream font-bold">{offer.tag}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 flex-grow">
                <span className="text-[10px] tracking-[2px] uppercase text-ocean font-bold flex items-center gap-2">
                  <Tag size={12} /> {offer.subtitle}
                </span>
                <h3 className="font-playfair text-2xl font-bold text-navy">{offer.title}</h3>
                <p className="text-[14px] leading-relaxed text-navy/70 font-light italic">"{offer.description}"</p>
                <div className="mt-auto pt-6">
                  <Link href={offer.link} className="group/btn inline-flex items-center gap-3 text-[10px] tracking-[3px] uppercase text-navy font-bold">
                    {offer.cta} <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1 text-ocean" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Perks Section */}
      <section className="py-24 px-8 md:px-20 bg-navy text-white overflow-hidden relative">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-ocean/5 -skew-x-12 translate-x-20"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[9px] tracking-[5px] uppercase text-ocean font-bold block mb-4">Complimentary</span>
            <h2 className="font-playfair text-4xl md:text-6xl font-bold text-white mb-6">Diner Benefits</h2>
            <p className="text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
              Every visit to Boat Seafood comes with special perks for our regular guests. Show your market shopping receipt or join our loyalty circle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {memberPerks.map((perk, i) => (
              <motion.div
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
                <h4 className="font-playfair text-2xl font-bold mb-4">{perk.title}</h4>
                <p className="text-white/50 font-light text-[14px] leading-relaxed italic">
                  {perk.description}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-24 text-center">
            <Link
              href="https://wa.me/971500000000"
              className="group relative bg-white text-navy rounded-lg py-5 px-14 font-jost max-md:whitespace-nowrap max-md:px-8 text-[10px] font-bold tracking-[3px] uppercase no-underline inline-block transition-all duration-500 overflow-hidden shadow-2xl hover:bg-ocean"
            >
              Join Member Circle
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
