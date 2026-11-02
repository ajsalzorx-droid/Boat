"use client";

import { MessageCircle, Home } from "lucide-react";
import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useSection } from "@/context/ContentContext";
import CatFishGrab from "@/components/CatFishGrab";

// MenuIcon-02 split in two layers: the plate (circle, fork, knife) and the fish Catbo steals
const FISH_SRC = "/MenuIcon-fish.webp";

const MenuIcon = ({ size = 24, alt, fishGone }: { size?: number; alt: string; fishGone: boolean }) => (
  <span className="relative block w-full h-full">
    <Image
      src="/MenuIcon-plate.webp"
      alt={alt}
      width={size}
      height={size}
      className="w-full h-full object-cover"
    />
    {/* Gone at once when taken, then slowly back */}
    <Image
      src={FISH_SRC}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] ${
        fishGone ? "opacity-0 scale-50 duration-0" : "opacity-100 scale-100 duration-[1500ms] ease-out"
      }`}
    />
  </span>
);

export default function FloatingActions() {
  const [fishGone, setFishGone] = useState(false);
  const menuRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  const { cartCount } = useCart();
  // Button names, alt text and WhatsApp link are edited in the SEO Studio (Header & Footer)
  const f = useSection("floating").fields;
  const isMenuPage = pathname === "/menu";
  // Customer shortcuts cover staff controls on small screens
  const isStaffPage = pathname.startsWith("/admin") || pathname.startsWith("/kitchen");
  // Not on the SEO Studio itself (they would cover the editor); its live preview still shows them.
  // Also not on the standalone flipbook viewer, or the booking page (only the form shows there)
  const hidden = pathname.startsWith("/seo") || pathname === "/profile" || pathname === "/book";

  if (hidden) return null;

  return (
    <>
    <div className={`fixed right-4 md:right-8 z-40 flex flex-col items-end gap-2.5 md:gap-3 transition-all duration-500 ${
      cartCount > 0 ? "bottom-32 md:bottom-8" : "bottom-5 md:bottom-8"
    } ${isStaffPage ? "max-md:hidden" : ""}`}>

      {/* Always visible: View Menu or Back Home */}
      <Link
        ref={menuRef}
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
          <MenuIcon size={56} alt={f.menu_alt} fishGone={fishGone} />
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
    {/* Not on /menu: the button shows Home there, there is no fish */}
    {!isMenuPage && <CatFishGrab target={menuRef} fishSrc={FISH_SRC} onFishGone={setFishGone} />}
    </>
  );
}
