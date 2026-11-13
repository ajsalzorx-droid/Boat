"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Mic, Send, Volume2, VolumeX, X } from "lucide-react";
import type { CatboData } from "./types";
import { ASKS, QUESTIONS, answer, type Go } from "./brain";

// Catbo, the restaurant's assistant: a chat over the page (a panel in the middle on a wide screen,
// a sheet from the bottom on a phone). Visitors ask about the restaurant, the offers, the menu,
// today's catch, where we are and more: tapping a ready-made question, typing, or speaking (the
// browser turns speech into text). Catbo answers in the chat and out loud (the browser's own
// speech, in a high voice); many answers end with an offer ("Do you want to see the menu?") that a
// yes, typed, spoken or tapped, carries out. See brain.ts for what it knows.

const VOICE = { pitch: 1.75, rate: 1.05 };
type Message = { from: "catbo" | "you"; text: string; ask?: Go; id: number };

// The browser's speech-to-text, where there is one (Chrome, Edge, Safari)
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
const recognitionClass = () =>
  typeof window === "undefined"
    ? undefined
    : ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition);

export default function CatboLive({ data, onClose }: { data: CatboData; onClose: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [hearing, setHearing] = useState(false);
  const [canHear] = useState(() => !!recognitionClass());
  const [muted, setMuted] = useState(false);
  const [asking, setAsking] = useState<Go | null>(null); // the offer the next yes or no answers
  const mutedRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const nextId = useRef(1);
  const recRef = useRef<Recognition | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mutedRef.current = muted;
    if (muted) window.speechSynthesis?.cancel();
  }, [muted]);

  // While open: the page behind does not scroll, and Escape closes
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // The chat keeps its newest message in view
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Catbo's voice: an English one, picked once the browser has its voices ready
  useEffect(() => {
    const find = () => {
      const all = window.speechSynthesis?.getVoices() ?? [];
      voiceRef.current =
        all.find((v) => /^en/i.test(v.lang) && /female|samantha|karen|zira|libby|sonia|google uk english female/i.test(v.name)) ??
        all.find((v) => /^en/i.test(v.lang)) ??
        null;
    };
    find();
    window.speechSynthesis?.addEventListener?.("voiceschanged", find);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", find);
      window.speechSynthesis?.cancel();
      recRef.current?.abort();
    };
  }, []);

  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    if (mutedRef.current || !synth || typeof SpeechSynthesisUtterance === "undefined") return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.lang = voiceRef.current?.lang ?? "en-GB";
    u.pitch = VOICE.pitch;
    u.rate = VOICE.rate;
    synth.speak(u);
  };

  // ---- The conversation ----
  const reply = (text: string, ask?: Go) => {
    setAsking(ask ?? null);
    const full = ask ? `${text} ${ASKS[ask]}` : text;
    setMessages((m) => [...m, { from: "catbo", text: full, ask, id: nextId.current++ }]);
    speak(full);
  };
  const go = (where: Go) => {
    setAsking(null);
    const href = data.links[where];
    const inside = href.startsWith("/");
    reply(
      {
        menu: "Here's our menu! Enjoy.",
        map: "Opening the map. See you soon!",
        book: "Opening the booking page. See you soon!",
        whatsapp: "Opening WhatsApp. Our team will help you!",
        order: "Opening Talabat. Enjoy your meal!",
      }[where],
    );
    window.setTimeout(
      () => {
        if (inside) {
          onClose();
          router.push(href);
        } else window.open(href, "_blank", "noopener,noreferrer");
      },
      inside ? 1100 : 300,
    );
  };
  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    window.speechSynthesis?.cancel();
    setMessages((m) => [...m, { from: "you", text: q, id: nextId.current++ }]);
    setDraft("");
    const r = answer(q, data, asking);
    if (!r.text && r.ask) return go(r.ask);
    window.setTimeout(() => reply(r.text, r.ask), 450); // a moment to think
  };
  const askRef = useRef(ask);
  useEffect(() => {
    askRef.current = ask;
  });

  // ---- Speaking a question ----
  const toggleListening = () => {
    const Rec = recognitionClass();
    if (!Rec) return;
    if (recRef.current) {
      recRef.current.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new Rec();
    rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let heard = "";
    rec.onresult = (e) => {
      heard = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      setDraft(heard);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") reply("I can't hear you! Please allow the microphone, or type your question instead.");
      else if (e.error === "no-speech") reply("I didn't hear anything. Tap the mic and try again, or type your question.");
    };
    rec.onend = () => {
      recRef.current = null;
      setHearing(false);
      if (heard.trim()) askRef.current(heard);
    };
    recRef.current = rec;
    setHearing(true);
    rec.start();
  };

  // Catbo says hello once it is open
  useEffect(() => {
    const id = window.setTimeout(
      () =>
        reply(
          `Hi! I'm Catbo, the ship's cat at ${data.name}. Ask me anything about us: our menu, today's offers, or where to find us. You can type, tap a question, or talk to me!`,
        ),
      300,
    );
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = messages.findLast((m) => m.from === "catbo");

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chat with Catbo, the restaurant's assistant"
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-navy/50 backdrop-blur-sm font-jost"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="w-full h-[88dvh] rounded-t-3xl md:w-[460px] md:h-[min(720px,90dvh)] md:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-navy/10 bg-[#f7e6d5]">
          <span className="relative w-11 h-11 rounded-full bg-white overflow-hidden shrink-0 border-2 border-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/catbo/catbo.webp" alt="" className="absolute w-[150%] max-w-none -left-[25%] -top-[8%]" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-navy font-bold text-[15px] leading-tight">Catbo</p>
            <p className="text-[12px] text-navy/60 leading-tight truncate">
              {hearing ? "Listening…" : `${data.name} assistant`}
              <span className="inline-block w-2 h-2 rounded-full bg-[#2bb673] ml-1.5 align-middle" aria-hidden />
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Turn Catbo's voice on" : "Turn Catbo's voice off"}
            className="w-9 h-9 rounded-full text-navy/70 hover:bg-navy/5 flex items-center justify-center"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full text-navy/70 hover:bg-navy/5 flex items-center justify-center">
            <X size={20} />
          </button>
        </header>

        {/* The conversation */}
        <div ref={logRef} className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-5 py-4 space-y-3" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] md:text-[15px] leading-snug ${
                  m.from === "you" ? "bg-navy text-cream rounded-br-md" : "bg-[#f3e6d6] text-navy rounded-bl-md"
                }`}
              >
                {m.from === "catbo" && m.id === last?.id ? <Typed text={m.text} /> : m.text}
                {/* Yes / No for Catbo's latest offer */}
                {m.ask && m.id === last?.id && asking === m.ask && (
                  <span className="flex gap-2 mt-2.5">
                    <button type="button" onClick={() => ask("Yes")} className="rounded-full bg-navy text-cream px-4 py-1.5 text-[12px] font-bold hover:bg-ocean hover:text-navy">
                      Yes, please
                    </button>
                    <button type="button" onClick={() => ask("No")} className="rounded-full border border-navy/30 text-navy px-4 py-1.5 text-[12px] font-bold hover:bg-navy/5">
                      No, thanks
                    </button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Ready-made questions */}
        <div className="flex gap-2 overflow-x-auto px-4 md:px-5 pb-2 pt-1 [scrollbar-width:none]">
          {QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="shrink-0 rounded-full border border-navy/15 bg-white text-navy px-3.5 py-2 text-[12.5px] font-semibold hover:bg-navy hover:text-cream transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Type, or speak */}
        <form
          className="flex items-center gap-2 px-3 md:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={hearing ? "Listening… speak now" : "Ask Catbo anything…"}
            aria-label="Your question for Catbo"
            maxLength={200}
            className="flex-1 min-w-0 rounded-full border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/30"
          />
          {canHear && (
            <button
              type="button"
              onClick={toggleListening}
              aria-pressed={hearing}
              aria-label={hearing ? "Stop listening" : "Ask by voice"}
              className={`relative w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                hearing ? "bg-offer text-white" : "bg-[#f3e6d6] text-navy hover:bg-navy hover:text-cream"
              }`}
            >
              {hearing && <span aria-hidden className="absolute inset-0 rounded-full bg-offer/40 animate-ping" />}
              <Mic size={20} className="relative" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim()}
            className="w-12 h-12 shrink-0 rounded-full bg-navy text-cream flex items-center justify-center hover:bg-ocean hover:text-navy disabled:opacity-40"
          >
            <Send size={19} />
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
}

// A message of Catbo's, its letters appearing as it says them (the rest held in place, unseen, so
// the bubble does not change size as they come)
function Typed({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setShown((n) => Math.min(text.length, n + 1)), 30);
    return () => window.clearInterval(id);
  }, [text]);
  return (
    <>
      <span>{text.slice(0, shown)}</span>
      <span className="opacity-0">{text.slice(shown)}</span>
    </>
  );
}
