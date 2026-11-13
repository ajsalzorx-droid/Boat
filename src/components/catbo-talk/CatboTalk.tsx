"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircleHeart, Sparkles } from "lucide-react";
import type { CatboData } from "./types";

// The "Meet Catbo" section on the home page. Until the visitor presses the button it is only text,
// one picture of Catbo and a speech bubble: the chat with Catbo (CatboLive.tsx) loads on the
// press, so the home page loads as quickly as it did without it. The chat opens over the page;
// closing it brings the page back.
const CatboLive = dynamic(() => import("./CatboLive"), { ssr: false, loading: () => null });

export default function CatboTalk({ data }: { data: CatboData }) {
  const [awake, setAwake] = useState(false);
  return (
    <section id="catbo" aria-labelledby="catbo-title" className="bg-[#f7e6d5] py-12 md:py-16 px-4 md:px-12 overflow-hidden">
      <div className="text-center max-w-2xl mx-auto mb-6 md:mb-10">
        <span className="inline-flex items-center gap-3 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-3">
          <Sparkles size={16} aria-hidden /> Say hello
        </span>
        <h2 id="catbo-title" className="font-playfair text-[clamp(36px,5vw,64px)] font-bold text-navy leading-none mb-3">
          Meet <em className="italic text-ocean">Catbo</em>
        </h2>
        <p className="text-[15px] md:text-[16px] leading-relaxed text-navy/80 font-light">
          Our ship&rsquo;s cat knows everything about {data.name}: today&rsquo;s offers, the fresh catch, our hours
          and how to find us. Ask Catbo by typing or with your voice.
        </p>
      </div>
      <Stage onWake={() => setAwake(true)} waking={awake} />
      {awake && <CatboLive data={data} onClose={() => setAwake(false)} />}
    </section>
  );
}

// Catbo before it wakes up (and while its voice loads)
function Stage({ onWake, waking }: { onWake?: () => void; waking?: boolean }) {
  return (
    <div className="max-w-5xl mx-auto grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-4 md:gap-10">
      <div className="relative mx-auto w-full max-w-[300px] md:max-w-[420px] aspect-[1284/1225]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/catbo/catbo.webp"
          alt="Catbo, a blue and white cat in a striped sailor's scarf"
          width={720}
          height={687}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full select-none"
          draggable={false}
        />
      </div>
      <div>
        <div className="relative bg-white rounded-3xl px-6 py-5 md:px-8 md:py-6 shadow-[0_12px_40px_-16px_rgba(0,48,73,0.35)] min-h-[120px] md:min-h-[140px] flex items-center">
          <span aria-hidden className="absolute -top-2 left-1/2 -translate-x-1/2 md:top-1/2 md:-left-2 md:translate-x-0 md:-translate-y-1/2 w-5 h-5 bg-white rotate-45" />
          <p className="relative text-navy text-[17px] md:text-[20px] leading-snug font-medium">
            Hi! I&rsquo;m Catbo, the ship&rsquo;s cat. Want to hear what&rsquo;s cooking today?
          </p>
        </div>
        <div className="mt-5 flex justify-center md:justify-start">
          <button
            type="button"
            onClick={onWake}
            disabled={waking}
            className="group inline-flex items-center gap-3 bg-navy text-cream rounded-full pl-6 pr-8 py-4 font-jost text-[12px] tracking-[3px] uppercase font-bold shadow-xl transition-colors hover:bg-ocean hover:text-navy disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean/50"
          >
            <MessageCircleHeart size={20} className="transition-transform group-hover:scale-110" aria-hidden />
            {waking ? "Catbo is awake!" : "Talk with Catbo"}
          </button>
        </div>
      </div>
    </div>
  );
}
