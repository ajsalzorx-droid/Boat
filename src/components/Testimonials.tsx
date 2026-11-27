"use client";

import { motion } from "framer-motion";
import { Star, Quote, ArrowUpRight, PenLine } from "lucide-react";
import { useSection } from "@/context/ContentContext";
import { Heading, StyledHeading } from "./ContentText";
import type { GoogleReviews } from "@/lib/google-reviews";

// Guest reviews on the homepage. With the Google Places API set up (src/lib/google-reviews.ts):
// the restaurant's Google rating and the reviews Google picks, each linked to Google. Otherwise the
// reviews written in the SEO Studio. Either way, a button to write a review on Google.

const FALLBACK_RATING = 5;

function Stars({ rating, size = 12, className = "fill-ocean text-ocean" }: { rating: number; size?: number; className?: string }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden className={n <= Math.round(rating) ? className : "text-white/20"} />
      ))}
    </div>
  );
}

export function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.3-4.7 3.3-8Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

export default function Testimonials({ google = null, writeUrl = null }: { google?: GoogleReviews | null; writeUrl?: string | null }) {
  const c = useSection("testimonials");
  const f = c.fields;
  const fromGoogle = !!google && google.reviews.length > 0;
  // Google's own "write a review" box when the place id is set up, else the link from the SEO Studio
  const reviewLink = google?.writeUrl || writeUrl || f.review_url || "https://share.google/6sDV8BO7ZwyKB4VK0";

  return (
    <section className="bg-navy py-32 px-8 md:px-20 relative overflow-hidden" aria-labelledby="reviews-title">
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,50 Q25,25 50,50 T100,50" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0,60 Q25,35 50,60 T100,60" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0,70 Q25,45 50,70 T100,70" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative z-10 text-center mb-16 md:mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-6">{f.eyebrow}</span>
          <StyledHeading as="h2" choice={f.title_style} id="reviews-title" className="font-playfair text-[clamp(36px,4.5vw,64px)] font-bold text-white leading-tight">
            <Heading c={c} emClassName="italic text-ocean" />
          </StyledHeading>

          {/* The Google rating: stars, number, how many reviews */}
          {google && google.count > 0 && (
            <a
              href={google.mapsUrl ?? reviewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-white transition-colors hover:border-ocean/40 hover:bg-white/[0.07]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <GoogleIcon size={18} />
              </span>
              <span className="font-playfair text-3xl font-bold leading-none">{google.rating.toFixed(1)}</span>
              <Stars rating={google.rating} size={16} className="fill-[#FBBC05] text-[#FBBC05]" />
              <span className="text-[12px] tracking-[1.5px] uppercase text-white/60">
                {google.count.toLocaleString("en-US")} Google reviews
              </span>
            </a>
          )}
        </motion.div>
      </div>

      {/* Rows of 3 (2 on a tablet); a shorter last row is centred */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8 relative z-10">
        {fromGoogle
          ? google!.reviews.slice(0, 6).map((r, i) => (
              <motion.figure
                key={`${r.author}-${i}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: (i % 3) * 0.1 }}
                className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.334rem)] bg-white/[0.03] border border-white/5 rounded-2xl p-8 md:p-10 flex flex-col group transition-all duration-500 hover:bg-white/[0.06] hover:border-ocean/20"
              >
                <figcaption className="flex items-center gap-3 mb-6">
                  {r.photo ? (
                    <img src={r.photo} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ocean/20 font-bold text-ocean">{r.author.charAt(0)}</span>
                  )}
                  <span className="min-w-0 flex-1 text-left">
                    {r.authorUrl ? (
                      <a href={r.authorUrl} target="_blank" rel="noopener noreferrer" className="block truncate font-playfair text-lg font-bold text-white hover:text-ocean">
                        {r.author}
                      </a>
                    ) : (
                      <span className="block truncate font-playfair text-lg font-bold text-white">{r.author}</span>
                    )}
                    <span className="text-[11px] text-white/40">{r.when}</span>
                  </span>
                  <GoogleIcon size={20} />
                </figcaption>
                <Stars rating={r.rating} className="fill-[#FBBC05] text-[#FBBC05]" />
                <blockquote className="mt-5 text-[15px] leading-[1.8] text-white/70 font-light line-clamp-6 flex-grow text-left">{r.text}</blockquote>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-fit items-center gap-1 text-[10px] font-bold uppercase tracking-[2px] text-ocean hover:text-white">
                    Read on Google <ArrowUpRight size={13} aria-hidden />
                  </a>
                )}
              </motion.figure>
            ))
          : c.items.map((t, i) => (
              <motion.figure
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: (i % 3) * 0.1 }}
                className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.334rem)] bg-white/[0.03] border border-white/5 rounded-2xl p-12 flex flex-col items-center text-center group transition-all duration-500 hover:bg-white/[0.06] hover:border-ocean/20"
              >
                <Quote aria-hidden="true" className="text-ocean mb-8 opacity-40 group-hover:opacity-100 transition-opacity" size={32} />
                <div className="mb-8">
                  <Stars rating={FALLBACK_RATING} />
                </div>
                <blockquote className="text-[16px] leading-[1.8] text-white/70 font-light italic mb-10 flex-grow">&ldquo;{t.content}&rdquo;</blockquote>
                <figcaption>
                  <p className="font-playfair text-xl font-bold text-white mb-1">{t.name}</p>
                  <span className="text-[10px] tracking-[3px] uppercase text-white/30 font-bold">{t.role}</span>
                </figcaption>
              </motion.figure>
            ))}
      </div>

      {/* Write a review on Google, and all the reviews there */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mt-16 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <a
          href={reviewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3 rounded-lg bg-white py-4 pl-4 pr-7 font-jost text-[11px] font-bold uppercase tracking-[2.5px] text-navy shadow-2xl transition-colors hover:bg-ocean"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
            <GoogleIcon size={18} />
          </span>
          {f.review_cta || "Write a Review on Google"}
          <PenLine size={15} aria-hidden className="transition-transform group-hover:-rotate-12" />
        </a>
        {google?.mapsUrl && (
          <a
            href={google.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 py-4 px-4 text-[11px] font-bold uppercase tracking-[2.5px] text-white/70 hover:text-white"
          >
            {f.all_reviews || "See all reviews"} <ArrowUpRight size={15} aria-hidden />
          </a>
        )}
      </motion.div>
    </section>
  );
}
