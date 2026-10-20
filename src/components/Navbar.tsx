"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Menu as MenuIcon, X, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useSection } from "@/context/ContentContext";

const smoothEase = [0.16, 1, 0.3, 1] as const;


// Panel unfolds downward, then links fade/slide in one after another
const mobileMenuVariants: Variants = {
  closed: {
    opacity: 0,
    y: -12,
    clipPath: "inset(0% 0% 100% 0%)",
    transition: { duration: 0.35, ease: smoothEase, staggerChildren: 0.03, staggerDirection: -1 },
  },
  open: {
    opacity: 1,
    y: 0,
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 0.5, ease: smoothEase, staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const mobileItemVariants: Variants = {
  closed: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.45, ease: smoothEase } },
};

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();
  const nav = useSection("navbar").fields;
  const mobileLinks = [
    { href: "/menu", label: nav.nav_menu },
    { href: "/seafood-menu-book", label: nav.nav_book },
    { href: "/#exp", label: nav.nav_experience },
    { href: "/#loc", label: nav.nav_location },
    { href: "/events", label: nav.nav_events },
    { href: "/offer", label: nav.nav_offer },
    { href: "/your-fish", label: nav.nav_fresh, accent: true },
  ];
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileDeliveryOpen, setIsMobileDeliveryOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        // Only shift on desktop, where the 38px top contact bar exists
        isScrolled ? "md:-translate-y-[38px]" : "translate-y-0"
      }`}
    >
      {/* Top Contact Bar */}
      <div className="hidden md:flex items-center justify-between px-16 py-1 border-b border-white/5 bg-ink/40 backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <a href={nav.phone_link} className="text-[9px] tracking-[2px] uppercase text-white/50 hover:text-ocean transition-colors flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ocean animate-pulse"></span>
            {nav.phone}
          </a>
          <span className="text-white/10">|</span>
          <span className="text-[9px] tracking-[2px] uppercase text-white/50 flex items-center gap-2">
            {nav.address}
          </span>
        </div>
        <div className="text-[9px] tracking-[2px] uppercase text-white/50">
          {nav.hours}
        </div>
      </div>

      <div
        className={`flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled
            ? "px-8 md:px-16 lg:px-8 xl:px-16 pt-3 pb-1.5 md:py-1.5 bg-ink/95 backdrop-blur-md shadow-2xl"
            : "px-8 md:px-16 lg:px-8 xl:px-16 pt-4 pb-3 md:py-3 bg-ink/80 backdrop-blur-sm"
        }`}
      >
        <Link
          href="/"
          className="relative h-16 md:h-20 w-52 md:w-auto shrink-0 no-underline flex items-center"
        >
          <img 
            src="/logo.png" 
            alt={nav.logo_alt}
            fetchPriority="high"
            className={`max-h-full w-auto object-contain transition-all duration-500 ${isScrolled ? "brightness-0 invert opacity-90" : "brightness-0 invert"}`} 
          />
        </Link>

        {/* Desktop Menu */}
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-5 min-[1440px]:gap-11 list-none m-0 p-0">
            <li>
              <Link
                href="/menu"
                className="text-white/65 hover:text-white text-[13px] min-[1440px]:text-[15px] font-medium tracking-[1.5px] min-[1440px]:tracking-[2px] uppercase transition-colors relative group"
              >
                {nav.nav_menu}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/seafood-menu-book"
                className="text-white/65 hover:text-white text-[13px] min-[1440px]:text-[15px] font-medium tracking-[1.5px] min-[1440px]:tracking-[2px] uppercase transition-colors relative group whitespace-nowrap"
              >
                {nav.nav_book}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/#exp"
                className="text-white/65 hover:text-white text-[13px] min-[1440px]:text-[15px] font-medium tracking-[1.5px] min-[1440px]:tracking-[2px] uppercase transition-colors relative group"
              >
                {nav.nav_experience}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/#loc"
                className="text-white/65 hover:text-white text-[13px] min-[1440px]:text-[15px] font-medium tracking-[1.5px] min-[1440px]:tracking-[2px] uppercase transition-colors relative group"
              >
                {nav.nav_location}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/events"
                className="text-white/65 hover:text-white text-[13px] min-[1440px]:text-[15px] font-medium tracking-[1.5px] min-[1440px]:tracking-[2px] uppercase transition-colors relative group"
              >
                {nav.nav_events}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/offer"
                className="text-white/65 hover:text-white text-[13px] min-[1440px]:text-[15px] font-medium tracking-[1.5px] min-[1440px]:tracking-[2px] uppercase transition-colors relative group"
              >
                {nav.nav_offer}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/your-fish"
                className="text-[#C49A3C] hover:text-white text-[13px] min-[1440px]:text-[15px] font-medium tracking-[1.5px] min-[1440px]:tracking-[2px] uppercase transition-colors relative group whitespace-nowrap"
              >
                {nav.nav_fresh}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-[#C49A3C] scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="hidden lg:flex items-center gap-4 min-[1440px]:gap-6">
          {/* Delivery Button with Dropdown */}
          <div className="relative ml-4 min-[1440px]:ml-11 group pb-2 -mb-2">
            <button 
              className="flex flex-col items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <img src="/images-removebg-preview.png" alt={nav.delivery_alt} loading="lazy" decoding="async" style={{ height: "36px", width: "auto" }} className="brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] tracking-[1px] uppercase mt-1 text-white">{nav.delivery}</span>
            </button>
            
            <div className="absolute top-[calc(100%-4px)] left-1/2 -translate-x-1/2 bg-ink/95 backdrop-blur-md border border-white/10 py-1.5 min-w-[140px] z-50 rounded shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 transform group-hover:-translate-y-0 translate-y-1">
              {/* Top Caret */}
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-ink border-l border-t border-white/10 rotate-45 z-0"></div>

              <div className="relative z-10 flex flex-col">
                <a href="https://www.talabat.com" target="_blank" rel="noopener noreferrer" className="group/item flex items-center gap-2.5 px-3 py-1.5 text-[10px] text-white/80 hover:text-white hover:bg-white/5 transition-colors tracking-[2px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00]"></span>
                  Talabat
                  <span className="ml-auto opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200">→</span>
                </a>
                <a href="https://food.noon.com" target="_blank" rel="noopener noreferrer" className="group/item flex items-center gap-2.5 px-3 py-1.5 text-[10px] text-white/80 hover:text-white hover:bg-white/5 transition-colors tracking-[2px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FEE000]"></span>
                  Noon Food
                  <span className="ml-auto opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200">→</span>
                </a>
                <a href="https://www.keeta.com" target="_blank" rel="noopener noreferrer" className="group/item flex items-center gap-2.5 px-3 py-1.5 text-[10px] text-white/80 hover:text-white hover:bg-white/5 transition-colors tracking-[2px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000]"></span>
                  Keeta
                  <span className="ml-auto opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200">→</span>
                </a>
              </div>
            </div>
          </div>

          <Link
            href="/menu"
            onClick={() => setIsCartOpen(true)}
            className="relative group"
          >
            <div className="bg-ocean text-navy rounded-lg py-3 px-5 min-[1440px]:px-8 text-[12px] min-[1440px]:text-[14px] font-bold tracking-[2px] uppercase transition-all hover:bg-white flex items-center gap-3 whitespace-nowrap">
              {nav.order}
              {cartCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 bg-navy text-white text-[10px] rounded-full">
                  {cartCount}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Mobile Cart & Menu Button */}
        <div className="flex items-center gap-5 lg:hidden">
          {cartCount > 0 && (
            <Link href="/menu" className="relative text-white">
              <ShoppingBag size={22} />
              <span className="absolute -top-2 -right-2 bg-ocean text-navy w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            </Link>
          )}
          <button
            className="text-white"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMobileMenuOpen ? "close" : "open"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="block"
              >
                {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.nav
          aria-label="Mobile"
          key="mobile-menu"
          variants={mobileMenuVariants}
          initial="closed"
          animate="open"
          exit="closed"
          className="absolute top-full left-0 right-0 bg-ink/95 backdrop-blur-md flex flex-col items-center py-8 gap-6 lg:hidden border-t border-white/5"
        >
          {mobileLinks.map((link) => (
            <motion.div key={link.href} variants={mobileItemVariants}>
              <Link
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`${link.accent ? "text-[#C49A3C]" : "text-white"} text-[15px] font-light tracking-[3px] uppercase`}
              >
                {link.label}
              </Link>
            </motion.div>
          ))}

          <motion.div variants={mobileItemVariants} className="flex flex-col items-center w-full">
            <button
              onClick={() => setIsMobileDeliveryOpen(!isMobileDeliveryOpen)}
              className="flex items-center gap-3 text-white text-[15px] font-light tracking-[3px] uppercase"
            >
              <img src="/images-removebg-preview.png" alt={nav.delivery_alt} decoding="async" style={{ height: "24px", width: "auto" }} className="brightness-0 invert" />
              {nav.delivery}
            </button>

            <AnimatePresence initial={false}>
            {isMobileDeliveryOpen && (
              <motion.div
                key="mobile-delivery"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: smoothEase }}
                className="overflow-hidden w-full"
              >
              <div className="flex flex-col items-center gap-4 pt-6 w-full">
                <a href="https://www.talabat.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[12px] text-white/80 transition-colors tracking-[2px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00]"></span>
                  Talabat
                </a>
                <a href="https://food.noon.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[12px] text-white/80 transition-colors tracking-[2px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FEE000]"></span>
                  Noon Food
                </a>
                <a href="https://www.keeta.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[12px] text-white/80 transition-colors tracking-[2px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000]"></span>
                  Keeta
                </a>
              </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        </motion.nav>
      )}
      </AnimatePresence>
    </header>
  );
}

