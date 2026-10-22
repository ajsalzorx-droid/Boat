"use client";

import { MessageCircle, Utensils, ChevronUp, Home } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useSection } from "@/context/ContentContext";
import { cdn } from "@/lib/cdn";

const MenuIcon = ({ size = 24, alt }: { size?: number; alt: string }) => (
  <Image
    src={cdn("/MenuIcon-02.webp")}
    alt={alt}
    width={size}
    height={size}
    className="w-full h-full object-cover"
  />
);

export default function FloatingActions() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const pathname = usePathname();
  const { cartCount } = useCart();
  // Button names, alt text and WhatsApp link are edited in the SEO Studio (Header & Footer)
  const f = useSection("floating").fields;
  const isMenuPage = pathname === "/menu";
  // Customer shortcuts cover staff controls on small screens
  const isStaffPage = pathname.startsWith("/admin") || pathname.startsWith("/kitchen");
  // Not on the SEO Studio itself (they would cover the editor); its live preview still shows them.
  // Also not on the standalone flipbook viewer
  const hidden = pathname.startsWith("/seo") || pathname === "/seafood-menu-book";

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (hidden) return null;

  return (
    <div className={`fixed right-4 md:right-8 z-40 flex flex-col items-end gap-2.5 md:gap-3 transition-all duration-500 ${
      cartCount > 0 ? "bottom-32 md:bottom-8" : "bottom-5 md:bottom-8"
    } ${isStaffPage ? "max-md:hidden" : ""}`}>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={scrollToTop}
            aria-label={f.top_label}
            title={f.top_label}
            className="w-11 h-11 md:w-14 md:h-14 flex items-center justify-center bg-navy/80 backdrop-blur-md text-white rounded-full shadow-lg border border-white/10 hover:bg-ocean hover:text-navy transition-all duration-300"
          >
            <ChevronUp size={24} className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Always visible: View Menu or Back Home */}
      <Link
        href={isMenuPage ? "/" : "/menu"}
        aria-label={isMenuPage ? f.home_label : f.menu_label}
        title={isMenuPage ? f.home_label : f.menu_label}
        className={`w-11 h-11 md:w-14 md:h-14 flex items-center justify-center rounded-full shadow-2xl border transition-all duration-300 overflow-hidden ${
          isMenuPage 
            ? "bg-navy/90 text-white border-white/10 hover:bg-ocean hover:text-navy" 
            : "bg-ocean text-navy border-ocean/30 hover:bg-white hover:text-navy"
        }`}
      >
        {isMenuPage ? (
          <Home size={24} className="shrink-0 w-5 h-5 md:w-6 md:h-6" />
        ) : (
          <MenuIcon size={56} alt={f.menu_alt} />
        )}
      </Link>

      {/* Always visible: WhatsApp */}
      <a
        href={f.whatsapp_link}
        aria-label={f.whatsapp_label}
        title={f.whatsapp_label}
        target="_blank"
        rel="noopener noreferrer"
        className="w-11 h-11 md:w-14 md:h-14 flex items-center justify-center bg-[#25D366] text-white rounded-full shadow-2xl border border-[#25D366]/30 hover:bg-white hover:text-[#25D366] transition-all duration-300"
      >
        <MessageCircle size={32} className="shrink-0 w-6 h-6 md:w-8 md:h-8" />
      </a>

    </div>
  );
}
