"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useSection } from "@/context/ContentContext";
import { Heading } from "@/components/ContentText";

// ─── Data ────────────────────────────────────────────────────────────────────
// Text, photos and lists come from the SEO Studio; the icons stay fixed by position.

const featureIcons = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z" />
        <path d="M8 12l3 3 5-5" />
      </svg>
    ),
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
      </svg>
    ),
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
];

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function YourFishPage() {
  const heroSection = useSection("fish_hero");
  const hero = heroSection.fields;
  const how = useSection("fish_steps");
  const stylesSection = useSection("fish_styles");
  const story = useSection("fish_story");
  const cta = useSection("fish_cta").fields;

  const steps = how.items.map((step, i) => ({
    title: step.title,
    description: step.description,
    image: step.image,
    alt: step.alt,
    number: String(i + 1).padStart(2, "0"),
  }));
  const styles = stylesSection.items;
  const features = [story.fields.feature1, story.fields.feature2, story.fields.feature3].map((label, i) => ({
    label,
    icon: featureIcons[i].icon,
  }));

  return (
    <>
      <Navbar />
      <main className="bg-[#F7F3EA] overflow-x-hidden">

        {/* ══════════════════════════════════════════════════════════
            1. HERO
        ══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex items-center">
          {/* cream bg left, image right */}
          <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
            <div className="bg-[#F7F3EA] hidden md:block" />
            <div className="relative overflow-hidden">
              <Image
                src={hero.image}
                alt={hero.image_alt}
                fill
                className="object-cover"
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              {/* left-edge blend */}
              <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#F7F3EA] to-transparent hidden md:block" />
              {/* cream veil on mobile: image fills the whole hero, text stays readable */}
              <div className="absolute inset-0 bg-[#F7F3EA]/85 md:hidden" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-16 lg:px-24 pt-40 pb-28">
            <div className="max-w-[580px]">
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7 }}
                className="flex items-center gap-3 mb-7"
              >
                <span className="w-10 h-[1.5px] bg-[#C89B4B]" />
                <span className="font-jost text-[10px] tracking-[5px] uppercase text-[#C89B4B] font-semibold">
                  {hero.eyebrow}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.1 }}
                className="font-playfair text-[clamp(34px,5vw,66px)] font-semibold text-[#0E2A47] leading-[1.1] mb-7"
              >
                <Heading c={heroSection}emClassName="text-[#C89B4B] not-italic font-normal" />
              </motion.h1>

              {/* Body */}
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.25 }}
                className="font-jost text-[15px] text-[#0E2A47]/65 leading-[1.8] font-light mb-10 max-w-[480px]"
              >
                {hero.body}
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.38 }}
                className="flex flex-wrap gap-4 mb-12"
              >
                <a
                  href={hero.cta_link}
                  // Outside links (WhatsApp) open in a new tab; the booking page opens here
                  {...(/^https?:/.test(hero.cta_link) && { target: "_blank", rel: "noopener noreferrer" })}
                  className="group inline-flex items-center gap-2.5 bg-[#0E2A47] text-white font-jost text-[11px] font-semibold tracking-[3px] uppercase px-9 py-4 max-md:whitespace-nowrap max-md:px-6 rounded-lg transition-all duration-300 hover:bg-[#C89B4B] hover:shadow-lg hover:shadow-[#C89B4B]/25 hover:-translate-y-0.5"
                >
                  {hero.cta}
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
                <a
                  href="#styles"
                  className="inline-flex items-center gap-2 border-2 border-[#0E2A47]/20 text-[#0E2A47] font-jost text-[11px] font-semibold tracking-[3px] uppercase px-9 py-4 max-md:whitespace-nowrap max-md:px-6 rounded-lg transition-all duration-300 hover:border-[#C89B4B] hover:text-[#C89B4B] hover:-translate-y-0.5"
                >
                  {hero.cta2}
                </a>
              </motion.div>

              {/* Trust pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="flex flex-wrap gap-3"
              >
                {[hero.pill1, hero.pill2, hero.pill3].filter(Boolean).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-[#C89B4B]/20 text-[#0E2A47]/70 font-jost text-[11px] tracking-[1px] px-4 py-2 rounded-full"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C89B4B]" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Floating badge — right side (desktop only) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="hidden md:block absolute right-16 lg:right-24 bottom-24 z-20"
            >
              <div className="bg-[#0E2A47] text-white rounded-2xl px-7 py-5 shadow-2xl shadow-[#0E2A47]/30 max-w-[220px] text-center border border-[#C89B4B]/20">
                <div className="w-10 h-10 rounded-full bg-[#C89B4B]/15 border border-[#C89B4B]/30 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-[#C89B4B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    <path d="M8 12l3 3 5-5" />
                  </svg>
                </div>
                <p className="font-playfair text-sm font-medium text-white leading-snug">
                  {hero.badge}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            2. HOW IT WORKS
        ══════════════════════════════════════════════════════════ */}
        <section className="bg-white py-28 px-6 md:px-16 lg:px-24">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <motion.div {...fadeUp()} className="text-center mb-20">
              <span className="font-jost text-[10px] tracking-[5px] uppercase text-[#C89B4B] font-semibold block mb-4">
                {how.fields.eyebrow}
              </span>
              <h2 className="font-playfair text-[clamp(28px,4vw,52px)] font-semibold text-[#0E2A47] mb-5">
                {how.fields.title}
              </h2>
              <p className="font-jost text-[15px] text-[#0E2A47]/55 font-light max-w-md mx-auto leading-relaxed">
                {how.fields.body}
              </p>
            </motion.div>

            {/* 3 step cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <motion.article
                  key={i}
                  {...fadeUp(i * 0.12)}
                  className="group relative bg-[#F7F3EA] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={step.image}
                      alt={step.alt || step.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    {/* Number badge */}
                    <div className="absolute top-5 left-5 w-10 h-10 bg-[#0E2A47] rounded-full flex items-center justify-center shadow-lg">
                      <span className="font-jost text-[11px] font-bold text-[#C89B4B] tracking-widest">{step.number}</span>
                    </div>
                  </div>
                  {/* Text */}
                  <div className="p-7">
                    <h3 className="font-playfair text-xl font-semibold text-[#0E2A47] mb-3 leading-snug">
                      {step.title}
                    </h3>
                    <p className="font-jost text-[13.5px] text-[#0E2A47]/60 leading-relaxed font-light">
                      {step.description}
                    </p>
                  </div>
                  {/* Gold accent bottom bar on hover */}
                  <div className="absolute bottom-0 left-0 w-0 h-[3px] bg-[#C89B4B] group-hover:w-full transition-all duration-500 rounded-b-3xl" />
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            3. PREPARATION STYLES
        ══════════════════════════════════════════════════════════ */}
        <section id="styles" className="bg-[#F7F3EA] py-28 px-6 md:px-16 lg:px-24">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <motion.div {...fadeUp()} className="text-center mb-20">
              <div className="flex items-center justify-center gap-4 mb-5">
                <span className="w-14 h-[1px] bg-[#C89B4B]/50" />
                <span className="font-cormorant italic text-[#C89B4B] text-2xl tracking-wide">
                  {stylesSection.fields.eyebrow}
                </span>
                <span className="w-14 h-[1px] bg-[#C89B4B]/50" />
              </div>
              <h2 className="font-playfair text-[clamp(26px,4vw,50px)] font-semibold text-[#0E2A47] mb-5">
                {stylesSection.fields.title}
              </h2>
              <p className="font-jost text-[14.5px] text-[#0E2A47]/55 font-light max-w-lg mx-auto leading-relaxed">
                {stylesSection.fields.body}
              </p>
            </motion.div>

            {/* 4 × 2 grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mb-14">
              {styles.map((s, i) => (
                <motion.article
                  key={i}
                  {...fadeUp(i * 0.07)}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 cursor-default"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={s.image}
                      alt={s.alt || s.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {/* Dark veil on hover */}
                    <div className="absolute inset-0 bg-[#0E2A47]/0 group-hover:bg-[#0E2A47]/20 transition-colors duration-500" />
                  </div>
                  {/* Label */}
                  <div className="px-4 py-4">
                    <h3 className="font-playfair text-[15px] font-semibold text-[#0E2A47] mb-1">
                      {s.title}
                    </h3>
                    <p className="font-jost text-[11.5px] text-[#0E2A47]/50 font-light leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                  {/* Gold bottom accent */}
                  <div className="h-[2px] w-0 group-hover:w-full bg-[#C89B4B] transition-all duration-500 mx-auto" />
                </motion.article>
              ))}
            </div>

            {/* And much more pill */}
            <motion.div {...fadeUp(0.2)} className="flex justify-center">
              <a
                href="/menu"
                className="group inline-flex items-center gap-3 bg-[#0E2A47] text-white font-jost text-[11px] font-semibold tracking-[3px] uppercase px-10 py-4 max-md:whitespace-nowrap max-md:px-7 rounded-lg transition-all duration-300 hover:bg-[#C89B4B] hover:shadow-lg hover:shadow-[#C89B4B]/25 hover:-translate-y-0.5"
              >
                {stylesSection.fields.cta}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            4. EXPERIENCE / STORY SECTION
        ══════════════════════════════════════════════════════════ */}
        <section className="bg-white py-28 px-6 md:px-16 lg:px-24">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <motion.div {...fadeUp()}>
              <span className="font-jost text-[10px] tracking-[5px] uppercase text-[#C89B4B] font-semibold block mb-5">
                {story.fields.eyebrow}
              </span>
              <h2 className="font-playfair text-[clamp(26px,3.5vw,46px)] font-semibold text-[#0E2A47] leading-[1.2] mb-7">
                <Heading c={story} emClassName="italic font-normal" />
              </h2>
              <p className="font-jost text-[15px] text-[#0E2A47]/60 leading-[1.85] font-light mb-10">
                {story.fields.body}
              </p>

              {/* Feature list */}
              <ul className="space-y-5 mb-10">
                {features.map((f, i) => (
                  <motion.li
                    key={i}
                    {...fadeUp(0.1 + i * 0.1)}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#F7F3EA] border border-[#C89B4B]/20 flex items-center justify-center text-[#C89B4B] shrink-0">
                      {f.icon}
                    </div>
                    <span className="font-jost text-[14px] font-medium text-[#0E2A47]">
                      {f.label}
                    </span>
                  </motion.li>
                ))}
              </ul>

              {/* Closing line */}
              <div className="border-l-2 border-[#C89B4B] pl-5">
                <p className="font-cormorant italic text-[22px] text-[#0E2A47] leading-snug">
                  {story.fields.closing}{" "}
                  <span className="text-[#C89B4B]">{story.fields.closing_highlight}</span>
                </p>
              </div>
            </motion.div>

            {/* Right: image */}
            <motion.div
              {...fadeUp(0.15)}
              className="relative"
            >
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src={story.fields.image}
                  alt={story.fields.image_alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {/* Overlay badge */}
                <div className="absolute bottom-6 left-6 right-6 bg-[#0E2A47]/85 backdrop-blur-md rounded-2xl p-5 border border-[#C89B4B]/20">
                  <p className="font-jost text-[10px] tracking-[3px] uppercase text-[#C89B4B] mb-1">
                    {story.fields.badge_label}
                  </p>
                  <p className="font-playfair text-white text-[15px] italic">
                    &ldquo;{story.fields.badge_quote}&rdquo;
                  </p>
                </div>
              </div>
              {/* Decorative gold ring */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full border-2 border-[#C89B4B]/20 -z-10 hidden md:block" />
              <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full border border-[#C89B4B]/15 -z-10 hidden md:block" />
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            5. FINAL CTA
        ══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-[#0E2A47] py-28 px-6 md:px-16">
          {/* subtle radial glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#C89B4B]/5 blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <motion.div {...fadeUp()}>
              <span className="font-jost text-[10px] tracking-[5px] uppercase text-[#C89B4B] font-semibold block mb-6">
                {cta.eyebrow}
              </span>
              <h2 className="font-playfair text-[clamp(28px,4.5vw,56px)] font-semibold text-white leading-[1.15] mb-6">
                {cta.title}
              </h2>
              <p className="font-jost text-[15px] text-white/55 font-light leading-relaxed mb-10 max-w-xl mx-auto">
                {cta.body}
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <a
                  href={cta.cta_link}
                  // Outside links (WhatsApp) open in a new tab; the booking page opens here
                  {...(/^https?:/.test(cta.cta_link) && { target: "_blank", rel: "noopener noreferrer" })}
                  className="group inline-flex items-center gap-2.5 bg-[#C89B4B] text-[#0E2A47] font-jost text-[11px] font-bold tracking-[3px] uppercase px-10 py-4 max-md:whitespace-nowrap max-md:px-7 rounded-lg transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-[#C89B4B]/30 hover:-translate-y-0.5"
                >
                  {cta.cta}
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
                <a
                  href={cta.cta2_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 border-2 border-white/20 text-white font-jost text-[11px] font-semibold tracking-[3px] uppercase px-10 py-4 max-md:whitespace-nowrap max-md:px-7 rounded-lg transition-all duration-300 hover:border-[#C89B4B]/60 hover:text-[#C89B4B] hover:-translate-y-0.5"
                >
                  {cta.cta2}
                </a>
              </div>

              <p className="font-jost text-[12px] text-white/30 tracking-wide">
                {cta.note}
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
