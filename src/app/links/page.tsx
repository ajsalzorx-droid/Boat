"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSection } from "@/context/ContentContext";

export default function LinksPage() {
  const [particles, setParticles] = useState<any[]>([]);
  const c = useSection("links_page").fields;

  useEffect(() => {
    // Generate ambient floating particles
    const newParticles = Array.from({ length: 18 }).map((_, i) => {
      const sz = 1.5 + Math.random() * 3;
      const x = Math.random() * 100;
      const dur = 14 + Math.random() * 20;
      const del = -(Math.random() * 18);
      const dx = (Math.random() - 0.5) * 80;
      const colors = [
        "rgba(196,154,60,0.1)",
        "rgba(168,197,184,0.08)",
        "rgba(242,237,228,0.06)",
      ];
      return {
        id: i,
        style: {
          left: `${x}vw`,
          bottom: `-${sz}px`,
          width: `${sz}px`,
          height: `${sz}px`,
          "--dx": `${dx}px`,
          animationDuration: `${dur}s`,
          animationDelay: `${del}s`,
          background: colors[Math.floor(Math.random() * colors.length)],
        } as React.CSSProperties,
      };
    });
    setParticles(newParticles);
  }, []);

  const saveContact = () => {
    const vcard =
      "BEGIN:VCARD\nVERSION:3.0\nFN:Boat Seafood Restaurant\nORG:Boat Seafood Restaurant\nADR;TYPE=WORK:;;Waterfront Market;Dubai;;;UAE\nEND:VCARD";
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Boat_Seafood_Restaurant.vcf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sharePage = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Boat Seafood Restaurant",
          text: c.share_text,
          url: typeof window !== "undefined" ? window.location.href : "",
        })
        .catch((error) => console.log("Error sharing", error));
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert("Link copied to clipboard!");
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-[#F2EDE4] font-outfit relative flex flex-col items-center justify-center overflow-hidden selection:bg-[#C49A3C] selection:text-[#0A1628]">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(164,197,184,0.07)_0%,transparent_60%),radial-gradient(ellipse_60%_40%_at_20%_80%,rgba(196,154,60,0.04)_0%,transparent_50%),radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(164,197,184,0.03)_0%,transparent_50%),linear-gradient(180deg,#0A1628_0%,#0F2137_40%,#0A1628_100%)]" />
      
      {/* Grain Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.025] bg-[url('data:image/svg+xml,%3Csvg_viewBox=%270_0_256_256%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter_id=%27n%27%3E%3CfeTurbulence_type=%27fractalNoise%27_baseFrequency=%270.85%27_numOctaves=%274%27_stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect_width=%27100%25%27_height=%27100%25%27_filter=%27url(%23n)%27/%3E%3C/svg%3E')] bg-[length:128px_128px]" />

      {/* Floating Particles */}
      {particles.map((p) => (
        <div key={p.id} className="particle" style={p.style} />
      ))}

      <style jsx>{`
        .particle {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          animation: drift linear infinite;
        }
        @keyframes drift {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 0.6; }
          85% { opacity: 0.2; }
          100% { transform: translateY(-100vh) translateX(var(--dx)); opacity: 0; }
        }
      `}</style>

      <main className="relative z-10 w-full max-auto max-w-[420px] px-7 py-12 md:py-16 flex flex-col items-center text-center">
        <h1 className="sr-only">{c.title}</h1>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-6 w-[220px] md:w-[280px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
        >
          <Image
            src="/logo.png"
            alt={c.logo_alt}
            width={280}
            height={100}
            className="w-full h-auto brightness-0 invert"
            priority
          />
        </motion.div>


        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="font-outfit text-[0.82rem] font-light tracking-[0.22em] uppercase text-[#A8C5B8] mb-1.5"
        >
          {c.tagline}
        </motion.p>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="flex items-center gap-1.5 text-[0.82rem] font-light text-[#D4C5A9]/70 tracking-wider mb-8"
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-[#D4C5A9]/50 stroke-2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          {c.location}
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#C49A3C]/40 to-transparent mb-8"
        />

        {/* Actions */}
        <nav aria-label="Quick links" className="w-full flex flex-col gap-3.5 mb-9">
          {/* 1. View Menu */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            <Link
              href="/menu"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-gradient-to-br from-[#C49A3C] to-[#8B6914] text-[#0A1628] font-medium tracking-wider shadow-[0_4px_20px_rgba(196,154,60,0.25),0_1px_3px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_28px_rgba(196,154,60,0.35),0_2px_6px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z"/><path d="M4 10h16"/><path d="M10 4v16"/>
              </svg>
              {c.btn_menu}
            </Link>
          </motion.div>

          {/* 2. Special Offers */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.15 }}
          >
            <Link
              href="/offer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-[#D4C5A9]/5 text-[#D4C5A9] border border-[#D4C5A9]/15 backdrop-blur-md hover:border-[#D4C5A9]/30 hover:text-[#e4d5b9] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              {c.btn_offers}
            </Link>
          </motion.div>

          {/* 3. Review Us */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <a
              href={c.review_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-[#A8C5B8]/10 text-[#A8C5B8] border border-[#A8C5B8]/20 backdrop-blur-md hover:border-[#A8C5B8]/40 hover:text-[#c2ddd2] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {c.btn_review}
            </a>
          </motion.div>

          {/* 4. Visit Us */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.25 }}
          >
            <a
              href={c.visit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-[#D4C5A9]/5 text-[#D4C5A9] border border-[#D4C5A9]/15 backdrop-blur-md hover:border-[#D4C5A9]/30 hover:text-[#e4d5b9] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {c.btn_visit}
            </a>
          </motion.div>

          {/* 5. Events */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.3 }}
          >
            <Link
              href="/events"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-[#D4C5A9]/5 text-[#D4C5A9] border border-[#D4C5A9]/15 backdrop-blur-md hover:border-[#D4C5A9]/30 hover:text-[#e4d5b9] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {c.btn_events}
            </Link>
          </motion.div>

          {/* 6. Save Contact */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.35 }}
          >
            <button
              onClick={saveContact}
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-[#D4C5A9]/5 text-[#D4C5A9] border border-[#D4C5A9]/15 backdrop-blur-md hover:border-[#D4C5A9]/30 hover:text-[#e4d5b9] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {c.btn_contact}
            </button>
          </motion.div>

          {/* 7. Fresh Catch */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <Link
              href="/your-fish"
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-[#D4C5A9]/5 text-[#D4C5A9] border border-[#D4C5A9]/15 backdrop-blur-md hover:border-[#D4C5A9]/30 hover:text-[#e4d5b9] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3c.5 1.5-.5 1.5 0 3M12 2.5c.5 1.5-.5 1.5 0 3M15 3c.5 1.5-.5 1.5 0 3" />
                <path d="M17 11.5l-13.6 1.8A2 2 0 002 15.3v.1A2 2 0 003.8 17.4l11.4 1A2 2 0 0017.3 16.6l1-5.1z" />
                <path d="M18 11.5l5-1" />
              </svg>
              {c.btn_fresh}
            </Link>
          </motion.div>

          {/* 8. Share */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.45 }}
          >
            <button
              onClick={sharePage}
              className="flex items-center justify-center gap-3 w-full p-4 rounded-lg bg-[#D4C5A9]/5 text-[#D4C5A9] border border-[#D4C5A9]/15 backdrop-blur-md hover:border-[#D4C5A9]/30 hover:text-[#e4d5b9] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {c.btn_share}
            </button>
          </motion.div>
        </nav>

        {/* Social Links */}
        <motion.div
          id="socials"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2.15 }}
          className="flex items-center gap-6 mb-8"
        >
          {[
            { id: "website", href: "/", icon: <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 3.84-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm1.19 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-3.84 3.56zM16.48 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/> },
            { id: "instagram", href: "https://www.instagram.com/boat_seafood_/", icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/> },
            { id: "facebook", href: "https://www.facebook.com/boatseafoodrestaurant/", icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/> },
            { id: "tiktok", href: "https://www.tiktok.com/@boatseafoodrestaurant", icon: <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/> },
            { id: "whatsapp", href: "https://wa.me/971500000000", icon: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/> },
          ].map((social) => (
            <a
              key={social.id}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#C49A3C]/35 hover:-translate-y-1 active:scale-[0.92] transition-all duration-300 group"
              aria-label={social.id.charAt(0).toUpperCase() + social.id.slice(1)}
            >
              <svg className="w-5 h-5 fill-[#D4C5A9] group-hover:fill-[#C49A3C] transition-colors duration-300" viewBox="0 0 24 24">
                {social.icon}
              </svg>
            </a>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.4 }}
          className="text-[0.72rem] font-light text-[#D4C5A9]/30 tracking-[0.15em] uppercase"
        >
          {c.footer}
        </motion.p>
      </main>
    </div>
  );
}
