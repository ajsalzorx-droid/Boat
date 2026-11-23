"use client";

import { cdn } from "@/lib/cdn";
import { MessageCircle, Home } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useSection } from "@/context/ContentContext";
import dynamic from "next/dynamic";
import CatFishGrab from "@/components/CatFishGrab";

// Catbo Racing, opened from the peeking cat: its code and pictures load only when it is opened
const CatboRace = dynamic(() => import("@/components/catbo-race/CatboRace"), { ssr: false });

// MenuIcon-02 split in two layers: the plate (circle, fork, knife) and the fish Catbo steals
const FISH_SRC = cdn("/MenuIcon-fish.webp");

// Catbo's face: the way into the game that is always there. The peeking cat is a video, which some
// phones never play (Reduce Motion, Low Power Mode, a slow connection)
const CATBO_SRC = cdn("/catbo/catbo.webp");

const MenuIcon = ({ size = 24, alt, fishGone }: { size?: number; alt: string; fishGone: boolean }) => (
  <span className="relative block w-full h-full">
    <Image
      src={cdn("/MenuIcon-plate.webp")}
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
  const [racing, setRacing] = useState(false);
  const menuRef = useRef<HTMLAnchorElement>(null);

  // The game QR code (boatseafood.com/game -> /?play=game) opens Catbo Racing straight away. The
  // "?play=game" is then taken off the address, so a reload or a shared link is the plain homepage
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("play") !== "game") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is only known in the browser, after the first render
    setRacing(true);
    url.searchParams.delete("play");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  const pathname = usePathname();
  const { cartCount } = useCart();
  // Button names, alt text and WhatsApp link are edited in the SEO Studio (Header & Footer)
  const f = useSection("floating").fields;
  const isMenuPage = pathname === "/menu";
  // Customer shortcuts (and Catbo) are never shown on staff screens: they cover the controls
  const isStaffPage = pathname.startsWith("/admin") || pathname.startsWith("/kitchen");
  // Not on the SEO Studio itself (they would cover the editor); its live preview still shows them.
  // Also not on the standalone flipbook viewer, or the booking page (only the form shows there)
  const hidden =
    isStaffPage || pathname.startsWith("/seo") || pathname === "/profile" || pathname === "/book" || pathname === "/360-view";

  if (hidden) return null;

  return (
    <>
    <div className={`fixed right-4 md:right-8 z-40 flex flex-col items-end gap-2.5 md:gap-3 short:gap-2 transition-all duration-500 ${
      cartCount > 0 ? "bottom-32 md:bottom-8" : "bottom-5 md:bottom-8"
    }`}>

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

      {/* Catbo Racing, on every device (same pages as the peeking cat) */}
      {!isMenuPage && (
        <button
          type="button"
          onClick={() => setRacing(true)}
          aria-label="Play Catbo Racing"
          title="Play Catbo Racing"
          className="relative w-11 h-11 md:w-14 md:h-14 rounded-full bg-cream shadow-2xl border border-navy/20 cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          <span className="absolute inset-0 rounded-full overflow-hidden">
            <Image src={CATBO_SRC} alt="" width={64} height={61} className="absolute max-w-none w-[112%] h-auto left-[-6%] top-[8%]" />
          </span>
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-navy text-cream px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] leading-none font-bold uppercase tracking-[1px]">
            Play
          </span>
        </button>
      )}

    </div>
    {/* Not on /menu: the button shows Home there, there is no fish */}
    {/* Not while the race is open: no cat over the game */}
    {!isMenuPage && !racing && <CatFishGrab target={menuRef} fishSrc={FISH_SRC} onFishGone={setFishGone} onPlay={() => setRacing(true)} />}
    {racing && <CatboRace onClose={() => setRacing(false)} />}
    </>
  );
}
