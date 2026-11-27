"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Menu as MenuIcon, X, ShoppingBag, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useSection } from "@/context/ContentContext";
import { useDeliveryApps } from "@/context/DeliveryContext";
import { cdn } from "@/lib/cdn";
import { TOUR_PUBLISHED } from "@/lib/seo";

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

// Desktop dropdown: drops in from the top, then its items slide in one after another
const dropdownVariants: Variants = {
  closed: { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.15, ease: "easeIn" } },
  open: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: smoothEase, staggerChildren: 0.04, delayChildren: 0.05 } },
};

const dropdownItemVariants: Variants = {
  closed: { opacity: 0, x: -6 },
  open: { opacity: 1, x: 0, transition: { duration: 0.25, ease: smoothEase } },
};

const dropdownItem =
  "group/item flex items-center gap-2.5 px-4 py-2 text-[11px] text-white/80 hover:text-white hover:bg-white/5 transition-colors tracking-[2px] uppercase whitespace-nowrap";

// Opens on hover, on keyboard focus and on tap (the trigger toggles it); Esc or leaving closes it
function NavDropdown({
  trigger,
  align = "center",
  className = "",
  empty = false,
  children,
}: {
  trigger: (open: boolean) => ReactNode;
  align?: "center" | "right";
  className?: string;
  empty?: boolean; // nothing to list: never opens
  children: ReactNode;
}) {
  const [hovered, setOpen] = useState(false);
  const open = hovered && !empty;
  const boxRef = useRef<HTMLDivElement>(null);
  const byMouse = useRef(false); // a mouse already opened it by hovering: its click keeps it open
  const place = align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  const caret = align === "right" ? "right-6" : "left-1/2 -translate-x-1/2";

  // A tap anywhere else closes it (touch screens have no "leave")
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const toggle = () => {
    const mouse = byMouse.current;
    byMouse.current = false;
    setOpen((o) => (mouse ? true : !o));
  };

  return (
    <div
      ref={boxRef}
      className={`relative ${className}`}
      onPointerDown={(e) => (byMouse.current = e.pointerType === "mouse")}
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onFocus={(e) => e.target.matches(":focus-visible") && setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {/* a click or tap on the trigger toggles it */}
      <div className="contents" onClick={toggle}>
        {trigger(open)}
      </div>
      {/* pt-3: the gap under the trigger still counts as inside, so the menu stays open on the way down */}
      <div className={`absolute top-full z-50 pt-3 ${place} ${open ? "" : "pointer-events-none"}`}>
        <AnimatePresence>
          {open && (
            <motion.div
              key="dropdown"
              variants={dropdownVariants}
              initial="closed"
              animate="open"
              exit="closed"
              style={{ transformOrigin: align === "right" ? "top right" : "top center" }}
              className="relative bg-ink/95 backdrop-blur-md border border-white/10 py-2 min-w-[180px] rounded-lg shadow-xl"
            >
              <div className={`absolute -top-[5px] w-2 h-2 bg-ink border-l border-t border-white/10 rotate-45 ${caret}`}></div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();
  const pathname = usePathname();
  const nav = useSection("navbar").fields;
  const deliveryApps = useDeliveryApps(); // Admin -> Delivery Apps; none: no Order Online menu
  // The Booking menu. Labels fall back while the site text cache is older than them.
  const bookingLinks = [
    { href: "/book", label: nav.nav_prebook || "Table Booking" },
    { href: "/menu", label: nav.nav_delivery || "Delivery" },
  ];
  const bookingLabel = nav.nav_booking || "Booking";
  const linksBefore = [
    { href: "/menu", label: nav.nav_menu },
    { href: "/#exp", label: nav.nav_experience },
    { href: "/#loc", label: nav.nav_location },
    { href: "/events", label: nav.nav_events },
    { href: "/menu?offers", label: nav.nav_offer },
  ];
  const linksAfter = [
    ...(TOUR_PUBLISHED ? [{ href: "/360-view", label: nav.nav_tour || "360 View" }] : []),
    { href: "/blog", label: nav.nav_blog || "Blog" },
    { href: "/your-fish", label: nav.nav_fresh, accent: true },
  ];
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileBookingOpen, setIsMobileBookingOpen] = useState(false);
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
      className={`site-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        // Only shift on desktop, where the 38px top contact bar exists
        isScrolled ? "md:-translate-y-[38px]" : "translate-y-0"
      }`}
    >
      {/* Top Contact Bar */}
      <div className="hidden md:flex items-center justify-between px-16 py-1 border-b border-white/5 bg-ink/40 backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <a href={nav.phone_link} className="text-[10px] lg:text-[12px] tracking-[1.5px] lg:tracking-[2px] uppercase text-white/50 hover:text-ocean transition-colors flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ocean animate-pulse"></span>
            {nav.phone}
          </a>
          <span className="text-white/10">|</span>
          <span className="text-[10px] lg:text-[12px] tracking-[1.5px] lg:tracking-[2px] uppercase text-white/50 flex items-center gap-2">
            {nav.address}
          </span>
        </div>
        <div className="text-[10px] lg:text-[12px] tracking-[1.5px] lg:tracking-[2px] uppercase text-white/50">
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
        {/* Logo */}
        <div className="relative shrink-0">
        <Link
          href="/"
          className="relative h-16 md:h-20 w-52 md:w-auto shrink-0 no-underline flex items-center"
        >
          <img
            src={cdn("/logo.webp")}
            alt={nav.logo_alt}
            fetchPriority="high"
            className={`max-h-full w-auto object-contain transition-all duration-500 ${isScrolled ? "brightness-0 invert opacity-90" : "brightness-0 invert"}`}
          />
        </Link>
        </div>

        {/* Desktop Menu */}
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-3 min-[1280px]:gap-4 min-[1440px]:gap-7 list-none m-0 p-0">
            <li>
              <Link
                href="/menu"
                className="text-white/65 hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group"
              >
                {nav.nav_menu}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/#exp"
                className="text-white/65 hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group"
              >
                {nav.nav_experience}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/#loc"
                className="text-white/65 hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group"
              >
                {nav.nav_location}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/events"
                className="text-white/65 hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group"
              >
                {nav.nav_events}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/menu?offers"
                className="text-white/65 hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group"
              >
                {nav.nav_offer}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <NavDropdown
                trigger={(open) => (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-haspopup="true"
                    className={`${open ? "text-white" : "text-white/65"} hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group whitespace-nowrap flex items-center gap-1`}
                  >
                    {bookingLabel}
                    <ChevronDown size={14} aria-hidden className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                    <span className={`absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? "scale-x-100" : "scale-x-0"}`}></span>
                  </button>
                )}
              >
                {bookingLinks.map((link) => (
                  <motion.div key={link.href} variants={dropdownItemVariants}>
                    <Link href={link.href} className={dropdownItem}>
                      {link.label}
                      <span className="ml-auto pl-4 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200">→</span>
                    </Link>
                  </motion.div>
                ))}
              </NavDropdown>
            </li>
            {TOUR_PUBLISHED && (
            <li>
              <Link
                href="/360-view"
                className="text-white/65 hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group whitespace-nowrap"
              >
                {nav.nav_tour || "360 View"}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            )}
            <li>
              <Link
                href="/blog"
                className="text-white/65 hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group whitespace-nowrap"
              >
                {nav.nav_blog || "Blog"}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
            <li>
              <Link
                href="/your-fish"
                className="text-[#C49A3C] hover:text-white text-[11.5px] min-[1280px]:text-[13px] min-[1440px]:text-[14px] font-medium tracking-[0.8px] min-[1280px]:tracking-[1.2px] min-[1440px]:tracking-[1.5px] uppercase transition-colors relative group whitespace-nowrap"
              >
                {nav.nav_fresh}
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-[#C49A3C] scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="hidden lg:flex items-center gap-2 min-[1280px]:gap-3 min-[1440px]:gap-5">
          {/* Order Online: the button orders on the website; its menu lists the delivery apps */}
          <NavDropdown
            align="right"
            empty={deliveryApps.length === 0}
            className="ml-1 min-[1280px]:ml-3 min-[1440px]:ml-6"
            trigger={(open) => (
              <Link
                href="/menu"
                // On the menu page it stays there (keeping a table's ?table=): opens the table's order when
                // it has dishes (only a table's order fills the cart, see MenuClient), else goes down to the dishes
                onClick={(e) => {
                  if (pathname !== "/menu") return;
                  e.preventDefault();
                  if (cartCount > 0) return setIsCartOpen(true);
                  const dishes = document.querySelector("nav[aria-label=\"Menu categories\"]");
                  if (dishes) window.scrollTo({ top: dishes.getBoundingClientRect().top + window.scrollY - 75, behavior: "smooth" });
                }}
                aria-expanded={deliveryApps.length > 0 ? open : undefined}
                className="relative group block"
              >
                <div className={`${open ? "bg-white" : "bg-ocean"} text-navy rounded-lg py-3 px-5 min-[1440px]:px-8 text-[12px] min-[1440px]:text-[14px] font-bold tracking-[2px] uppercase transition-all hover:bg-white flex items-center gap-3 whitespace-nowrap`}>
                  {nav.order}
                  {cartCount > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 bg-navy text-white text-[10px] rounded-full">
                      {cartCount}
                    </span>
                  )}
                  {deliveryApps.length > 0 && (
                    <ChevronDown size={16} aria-hidden className={`-mx-1 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                  )}
                </div>
              </Link>
            )}
          >
            {deliveryApps.length > 0 && (
              // A long list scrolls inside a fixed height (data-lenis-prevent: the wheel scrolls the list, not the page)
              <div data-lenis-prevent className="delivery-scroll relative z-10 flex flex-col max-h-[144px] overflow-y-auto overscroll-contain">
                {deliveryApps.map((app) => (
                  <motion.a key={app.name + app.url} variants={dropdownItemVariants} href={app.url} target="_blank" rel="noopener noreferrer" className={dropdownItem}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: app.color }}></span>
                    {app.name}
                    <span className="ml-auto pl-4 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200">→</span>
                  </motion.a>
                ))}
              </div>
            )}
          </NavDropdown>
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
          {linksBefore.map((link) => (
            <motion.div key={link.href} variants={mobileItemVariants}>
              <Link
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white text-[15px] font-light tracking-[3px] uppercase"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}

          {/* Booking: Table Booking, Delivery */}
          <motion.div variants={mobileItemVariants} className="flex flex-col items-center w-full">
            <button
              type="button"
              onClick={() => setIsMobileBookingOpen(!isMobileBookingOpen)}
              aria-expanded={isMobileBookingOpen}
              className="flex items-center gap-2 text-white text-[15px] font-light tracking-[3px] uppercase"
            >
              {bookingLabel}
              <ChevronDown size={16} aria-hidden className={`transition-transform duration-300 ${isMobileBookingOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
            {isMobileBookingOpen && (
              <motion.div
                key="mobile-booking"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: smoothEase }}
                className="overflow-hidden w-full"
              >
              <div className="flex flex-col items-center gap-4 pt-6 w-full">
                {bookingLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="text-[12px] text-white/80 tracking-[2px] uppercase">
                    {link.label}
                  </Link>
                ))}
              </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>

          {linksAfter.map((link) => (
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

          {/* Order Online: the delivery apps */}
          {deliveryApps.length > 0 && (
          <motion.div variants={mobileItemVariants} className="flex flex-col items-center w-full">
            <button
              type="button"
              onClick={() => setIsMobileDeliveryOpen(!isMobileDeliveryOpen)}
              aria-expanded={isMobileDeliveryOpen}
              className="flex items-center gap-2 bg-ocean text-navy rounded-lg py-3 px-6 text-[13px] font-bold tracking-[2px] uppercase"
            >
              {nav.order}
              <ChevronDown size={16} aria-hidden className={`transition-transform duration-300 ${isMobileDeliveryOpen ? "rotate-180" : ""}`} />
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
                {deliveryApps.map((app) => (
                  <a key={app.name + app.url} href={app.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[12px] text-white/80 transition-colors tracking-[2px] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: app.color }}></span>
                    {app.name}
                  </a>
                ))}
              </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
          )}
        </motion.nav>
      )}
      </AnimatePresence>
    </header>
  );
}

