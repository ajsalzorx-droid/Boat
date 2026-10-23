"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Music, Square } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from "framer-motion";
import CatPuppet, { CAT_W, CAT_H, MOUTH, useRig } from "./catbo/CatPuppet";
import { blink, chew, dance, idle, listen, openForFood, reactions, refuse, rest, zoneAt, type Zone } from "./catbo/moves";
import { boop, chomp, clap, giggle, hiss, meow, playDanceTrack, purr, sneeze } from "./catbo/sounds";

// "Talk to Catbo" - a Talking Tom style play section for the Catbo mascot (coming soon feature).
// - Talk: the mic listens, and when you stop speaking Catbo repeats it back in a squeaky voice
//   (your recording played faster = higher pitch), moving its mouth to the sound.
// - Dance: Catbo dances to a little beat.
// - Touch: head, nose, paw, belly, tail, feet and scarf each get their own reaction.
// - Feed: tap or drag seafood onto the cat; it chomps and its tummy fills up (and slowly empties).
// The puppet is in ./catbo; all sounds are made in the browser and nothing is uploaded.

const FOODS = [
  { emoji: "🐟", name: "Fish", fill: 20 },
  { emoji: "🦐", name: "Prawn", fill: 15 },
  { emoji: "🦀", name: "Crab", fill: 25 },
  { emoji: "🦞", name: "Lobster", fill: 30 },
  { emoji: "🦑", name: "Calamari", fill: 15 },
];

const TOUCH: Record<Zone, { sound: (ctx: AudioContext) => void; soundDelay?: number; lines: string[]; burst: string[] }> = {
  head: { sound: (ctx) => purr(ctx), lines: ["Purrr… 😻", "That's the spot! 💙"], burst: ["💙", "💙", "✨"] },
  nose: { sound: sneeze, lines: ["Achoo! 🤧", "Boop! Hehe 😸"], burst: ["💨", "✨"] },
  paw: { sound: clap, soundDelay: 280, lines: ["High five! ✋", "Paw-some! 🐾"], burst: ["⭐", "✨", "⭐"] },
  belly: { sound: giggle, lines: ["Hehe, that tickles! 😹", "Not the belly! 😆"], burst: ["😹", "✨"] },
  tail: { sound: hiss, lines: ["Hey! Not the tail! 😾", "Mrrrow! 😾"], burst: ["💢"] },
  feet: { sound: giggle, lines: ["My toes! Hehe 🐾", "Stop, stop! 😹"], burst: ["🐾", "✨"] },
  scarf: { sound: boop, lines: ["Ahoy, captain! ⚓", "Fancy, right? 💙"], burst: ["⚓", "✨"] },
  body: { sound: (ctx) => meow(ctx), lines: ["Meow! 😺", "Mrrrow?"], burst: ["💙"] },
};

const VOICE_PITCH = 1.6; // playback speed of the repeated voice (higher = squeakier)
const SPEECH_LEVEL = 0.03; // mic loudness (RMS) that counts as speaking
const SILENCE_MS = 900; // this much quiet ends what you said
const MAX_TALK_MS = 8000;
const PRE_ROLL_MS = 300; // keep a little audio from before the voice was detected, so the first word isn't cut

type Mood = "idle" | "listening" | "hearing" | "talking" | "busy" | "dancing";
type Flying = { id: number; emoji: string; from: { x: number; y: number }; to: { x: number; y: number }; fill: number };
type Particle = { id: number; emoji: string; x: number; y: number; dx: number };

let nextId = 1;

// Randomness / time used by the event handlers below (kept out of the component body)
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const now = () => performance.now();

export default function CatboPlay() {
  const reduceMotion = useReducedMotion();
  const rig = useRig();
  const [mood, setMoodState] = useState<Mood>("idle");
  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState("");
  const [tummy, setTummy] = useState(30);
  const [message, setMessage] = useState<string | null>(null);
  const [flying, setFlying] = useState<Flying[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  // Audio state lives in refs: the mic callback runs outside React renders
  const moodRef = useRef<Mood>("idle");
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const preRollRef = useRef<Float32Array[]>([]);
  const chunksRef = useRef<Float32Array[]>([]);
  const recordingRef = useRef(false);
  const lastLoudRef = useRef(0);
  const startedRef = useRef(0);
  const micOnRef = useRef(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const danceRef = useRef<{ stop: () => void; timer: ReturnType<typeof setTimeout> } | null>(null);

  const setMood = (m: Mood) => {
    moodRef.current = m;
    setMoodState(m);
  };

  const say = (text: string, ms = 1800) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(null), ms);
  };

  // After any action: back to listening (mic on) or to the idle loop
  const settle = () => {
    if (micOnRef.current) {
      setMood("listening");
      listen(rig);
    } else {
      setMood("idle");
      rest(rig).then(() => moodRef.current === "idle" && idle(rig));
    }
  };

  const isFree = () => moodRef.current === "idle" || moodRef.current === "listening" || moodRef.current === "hearing";

  // Browsers only allow audio after a tap, so the context is created from a click handler
  const getCtx = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  // ---------- Talk back, with lip-sync ----------

  const playVoice = (buffer: AudioBuffer) => {
    const ctx = getCtx();
    setMood("talking");
    for (const k of ["headRot", "armRot", "jawOpen", "jawWidth", "lidL", "lidR"] as const) rig[k].stop();
    rig.lidL.set(0);
    rig.lidR.set(0);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = VOICE_PITCH;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.4;
    src.connect(analyser);
    analyser.connect(ctx.destination);

    const wave = new Float32Array(analyser.fftSize);
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    const hzPerBin = ctx.sampleRate / analyser.fftSize;
    let open = 0;
    let width = 1;
    let frame = 0;
    const tick = () => {
      // Loudness opens the jaw; it snaps shut on pauses (m, b, p sounds)
      analyser.getFloatTimeDomainData(wave);
      let sum = 0;
      for (let i = 0; i < wave.length; i++) sum += wave[i] * wave[i];
      const level = Math.min(1, Math.sqrt(sum / wave.length) * 7);
      const target = level < 0.06 ? 0 : Math.min(1, 0.25 + level);
      open += (target - open) * (target > open ? 0.55 : 0.3);

      // The "brightness" of the sound picks the mouth shape: dark = round "oo", bright = wide "ee"
      analyser.getByteFrequencyData(spectrum);
      let num = 0;
      let den = 0;
      for (let i = 2; i < spectrum.length; i++) {
        num += i * spectrum[i];
        den += spectrum[i];
      }
      const centroid = den ? (num / den) * hzPerBin : 0;
      const shape = centroid < 1800 ? 0.8 : centroid > 3600 ? 1.15 : 1;
      width += (shape - width) * 0.25;

      rig.jawOpen.set(open * (width > 1.08 ? 0.7 : 1));
      rig.jawWidth.set(width);
      rig.headRot.set(-2 + open * 4);
      rig.armRot.set(-open * 12);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    src.onended = () => {
      cancelAnimationFrame(frame);
      settle();
    };
    src.start();
  };

  const finishRecording = () => {
    recordingRef.current = false;
    const ctx = ctxRef.current;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (!ctx) return;

    // Drop most of the trailing silence so Catbo answers right away
    let length = chunks.reduce((n, c) => n + c.length, 0);
    length = Math.max(0, length - Math.round(((SILENCE_MS - 200) / 1000) * ctx.sampleRate));
    if (length < ctx.sampleRate * 0.25) {
      setMood("listening");
      return;
    }
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const out = buffer.getChannelData(0);
    let offset = 0;
    for (const c of chunks) {
      if (offset >= length) break;
      out.set(c.subarray(0, Math.min(c.length, length - offset)), offset);
      offset += c.length;
    }
    playVoice(buffer);
  };

  const onSamples = (buf: Float32Array) => {
    const m = moodRef.current;
    if (m !== "listening" && m !== "hearing") return; // ignore the mic while Catbo talks, dances or reacts

    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const t = now();
    const rate = ctxRef.current?.sampleRate ?? 48000;

    if (!recordingRef.current) {
      const pre = preRollRef.current;
      pre.push(buf);
      while (pre.length * buf.length > (PRE_ROLL_MS / 1000) * rate) pre.shift();
      if (rms > SPEECH_LEVEL) {
        recordingRef.current = true;
        chunksRef.current = [...pre];
        preRollRef.current = [];
        lastLoudRef.current = t;
        startedRef.current = t;
        setMood("hearing");
      }
    } else {
      chunksRef.current.push(buf);
      if (rms > SPEECH_LEVEL) lastLoudRef.current = t;
      if (t - lastLoudRef.current > SILENCE_MS || t - startedRef.current > MAX_TALK_MS) finishRecording();
    }
  };

  const stopMic = () => {
    micOnRef.current = false;
    setMicOn(false);
    recordingRef.current = false;
    chunksRef.current = [];
    preRollRef.current = [];
    procRef.current?.disconnect();
    srcRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    procRef.current = null;
    srcRef.current = null;
    streamRef.current = null;
    if (moodRef.current === "listening" || moodRef.current === "hearing") settle();
  };

  const startMic = async () => {
    setMicError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Voice needs a secure (https) connection.");
      say("I can't hear you here 🙀");
      return;
    }
    const ctx = getCtx();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const src = ctx.createMediaStreamSource(stream);
      // ScriptProcessor gives raw samples in every browser (incl. Safari) without format headaches
      const proc = ctx.createScriptProcessor(2048, 1, 1);
      const silent = ctx.createGain();
      silent.gain.value = 0;
      proc.onaudioprocess = (e) => onSamples(new Float32Array(e.inputBuffer.getChannelData(0)));
      src.connect(proc);
      proc.connect(silent).connect(ctx.destination);

      streamRef.current = stream;
      srcRef.current = src;
      procRef.current = proc;
      micOnRef.current = true;
      setMicOn(true);
      if (moodRef.current === "idle") settle();
    } catch {
      setMicError("Allow the microphone to talk to Catbo.");
      say("I can't hear you 🙀");
    }
  };

  // ---------- Dance ----------

  const stopDance = (finished: boolean) => {
    const d = danceRef.current;
    if (!d) return;
    danceRef.current = null;
    clearTimeout(d.timer);
    d.stop();
    settle();
    if (finished) say("That was fun! 🎉");
  };

  const startDance = () => {
    if (!isFree()) return;
    const ctx = getCtx();
    recordingRef.current = false;
    chunksRef.current = [];
    setMood("dancing");
    const track = playDanceTrack(ctx);
    dance(rig, track.beat);
    say("Let's dance! 🎶", 2200);
    danceRef.current = { stop: track.stop, timer: setTimeout(() => stopDance(true), track.duration * 1000 + 80) };
  };

  // Life: idle loop on mount, a blink every few seconds, cleanup on leave
  useEffect(() => {
    idle(rig);
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      timer = setTimeout(() => {
        const m = moodRef.current;
        if ((m === "idle" || m === "listening" || m === "talking") && rig.lidL.get() === 0) blink(rig);
        scheduleBlink();
      }, rand(2200, 5000));
    };
    scheduleBlink();

    // Stop listening once the section scrolls away
    const el = sectionRef.current;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && micOnRef.current) stopMic();
    });
    if (el) io.observe(el);

    return () => {
      clearTimeout(timer);
      io.disconnect();
      stopMic();
      if (danceRef.current) {
        clearTimeout(danceRef.current.timer);
        danceRef.current.stop();
      }
      ctxRef.current?.close();
      ctxRef.current = null;
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tummy slowly empties so Catbo gets hungry again
  useEffect(() => {
    const id = setInterval(() => setTummy((t) => Math.max(0, t - 2)), 4000);
    return () => clearInterval(id);
  }, []);

  // ---------- Touch ----------

  const stagePoint = (clientX: number, clientY: number) => {
    const stage = stageRef.current?.getBoundingClientRect();
    return stage ? { x: clientX - stage.left, y: clientY - stage.top } : null;
  };

  const mouthPoint = () => {
    const cat = catRef.current?.getBoundingClientRect();
    return cat ? stagePoint(cat.left + cat.width * MOUTH.x, cat.top + cat.height * MOUTH.y) : null;
  };

  const burst = (emojis: string[], at: { x: number; y: number }) => {
    const items = emojis.map((emoji) => ({ id: nextId++, emoji, x: at.x, y: at.y, dx: rand(-60, 60) }));
    setParticles((p) => [...p, ...items]);
    setTimeout(() => setParticles((p) => p.filter((x) => !items.includes(x))), 1300);
  };

  const touch = (zone: Zone, at: { x: number; y: number } | null) => {
    if (!isFree()) return;
    const ctx = getCtx();
    const r = TOUCH[zone];
    recordingRef.current = false;
    chunksRef.current = [];
    setMood("busy");
    setTimeout(() => r.sound(ctx), r.soundDelay ?? 0);
    say(pick(r.lines), 1600);
    if (at) burst(r.burst, at);
    reactions[zone](rig).then(settle);
  };

  const onCatClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const cat = catRef.current?.getBoundingClientRect();
    if (!cat) return;
    // Back to source-picture pixels to find which part was touched
    const x = ((e.clientX - cat.left) / cat.width) * CAT_W;
    const y = ((e.clientY - cat.top) / cat.height) * CAT_H;
    touch(zoneAt(x, y), stagePoint(e.clientX, e.clientY));
  };

  // ---------- Feeding ----------

  const feed = (food: (typeof FOODS)[number], fromClient: { x: number; y: number }) => {
    const from = stagePoint(fromClient.x, fromClient.y);
    const to = mouthPoint();
    if (!from || !to || !isFree()) return;
    getCtx();

    if (tummy >= 100) {
      setMood("busy");
      say("I'm full! Maybe later 😸");
      refuse(rig).then(settle);
      return;
    }
    recordingRef.current = false;
    chunksRef.current = [];
    setMood("busy");
    openForFood(rig);
    setFlying((f) => [...f, { id: nextId++, emoji: food.emoji, from, to, fill: food.fill }]);
  };

  const onFoodArrived = (item: Flying) => {
    setFlying((f) => f.filter((x) => x.id !== item.id));
    chomp(getCtx(), 3);
    burst(["✨", "💙", "😋"], item.to);
    const next = Math.min(100, tummy + item.fill);
    setTummy(next);
    say(next >= 100 ? "So full… purr 😻" : pick(["Yum! 😋", "Mmm, fresh! 🐾", "More please! 😺", "Delicious! 💙"]));
    chew(rig).then(settle);
  };

  const onFoodDragEnd = (food: (typeof FOODS)[number], info: PanInfo) => {
    const cat = catRef.current?.getBoundingClientRect();
    if (!cat) return;
    const x = info.point.x - window.scrollX;
    const y = info.point.y - window.scrollY;
    const pad = 30;
    if (x > cat.left - pad && x < cat.right + pad && y > cat.top - pad && y < cat.bottom + pad) feed(food, { x, y });
  };

  const dancing = mood === "dancing";

  const bubbleText =
    message ??
    (mood === "listening"
      ? "I'm listening… 👂"
      : mood === "hearing"
        ? "Mm-hmm… 👀"
        : mood === "talking"
          ? "🎶"
          : dancing
            ? "🎵 🎶 🎵"
            : tummy < 20
              ? "I'm hungry… feed me? 🐟"
              : "Talk, tap or feed me!");

  const micLabel = !micOn
    ? "Tap to talk"
    : mood === "hearing"
      ? "Hearing you…"
      : mood === "talking"
        ? "Catbo is talking"
        : "Listening - say something";

  return (
    <section ref={sectionRef} id="catbo" aria-label="Talk to Catbo" className="relative overflow-hidden bg-cream py-24 px-6">
      <div className="absolute -top-[260px] -left-[260px] w-[620px] h-[620px] rounded-full bg-[radial-gradient(circle,rgba(102,155,188,0.18)_0%,transparent_70%)] pointer-events-none"></div>
      <div className="absolute -bottom-[260px] -right-[200px] w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(0,48,73,0.08)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="relative max-w-[1150px] mx-auto grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-x-16 gap-y-10 items-center">
        {/* Heading */}
        <motion.div
          className="text-center lg:text-left lg:col-start-1 lg:row-start-1 self-end"
          initial={{ opacity: 0, y: 38 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-3.5 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-6">
            <span className="w-6.5 h-[1px] bg-ocean shrink-0"></span>
            Coming soon · Say hi now
          </span>
          <h2 className="font-playfair font-bold leading-[1.07] text-navy text-[clamp(34px,4vw,56px)] mb-5">
            Talk to <em className="italic text-ocean">Catbo</em>
          </h2>
          <p className="text-[15px] leading-[1.9] text-navy/70 font-normal max-w-[440px] mx-auto lg:mx-0">
            Our new crew member loves a chat, a dance and fresh seafood. Say something and Catbo repeats it in a funny voice.
            Pat the head, boop the nose, high-five the paw, poke the belly… just don&apos;t pull the tail!
          </p>
        </motion.div>

        {/* Stage */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div
            ref={stageRef}
            className="relative mx-auto w-full max-w-[480px] h-[500px] md:h-[580px] rounded-[32px] bg-gradient-to-b from-white/80 to-[#e9f1f6] border border-navy/10 shadow-[0_30px_60px_-30px_rgba(0,48,73,0.35)] overflow-hidden select-none"
          >
            {/* Disco lights while dancing */}
            <AnimatePresence>
              {dancing && !reduceMotion && (
                <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {["#669bbc", "#e4473a", "#f2c14e"].map((c, i) => (
                    <motion.span
                      key={c}
                      className="absolute top-0 left-1/2 w-[140%] h-[140%] -translate-x-1/2 origin-top"
                      style={{ background: `conic-gradient(from 170deg at 50% 0%, transparent 0deg, ${c}33 8deg, transparent 16deg)` }}
                      animate={{ rotate: i % 2 ? [-25, 25, -25] : [25, -25, 25] }}
                      transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Speech bubble */}
            <div className="absolute top-5 inset-x-0 flex justify-center z-20 px-4 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={bubbleText}
                  // Quick exit: the next line waits for it ("wait" mode), and reaction lines are short
                  initial={{ opacity: 0, scale: 0.6, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 22, opacity: { duration: 0.12 } } }}
                  exit={{ opacity: 0, scale: 0.85, y: -4, transition: { duration: 0.1 } }}
                  className="relative bg-white text-navy rounded-2xl shadow-lg border border-navy/10 px-4 py-2.5 font-[family-name:var(--font-outfit)] text-[15px] md:text-[16px] font-medium"
                >
                  {bubbleText}
                  <span className="absolute left-1/2 -bottom-[7px] -translate-x-1/2 w-3.5 h-3.5 bg-white border-r border-b border-navy/10 rotate-45"></span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Listening rings */}
            <AnimatePresence>
              {(mood === "listening" || mood === "hearing") && (
                <motion.div
                  className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full border-2 ${mood === "hearing" ? "border-[#e4473a]/40" : "border-ocean/40"}`}
                      animate={reduceMotion ? undefined : { scale: [0.6, 1.5], opacity: [0.8, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floor shadow */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[92px] md:bottom-[104px] w-[160px] md:w-[195px] h-4 rounded-[50%] bg-navy/15 blur-[4px]"></div>

            {/* Catbo */}
            <div className="absolute left-1/2 bottom-[96px] md:bottom-[108px] -translate-x-1/2 w-[200px] md:w-[240px]">
              <CatPuppet
                ref={catRef}
                rig={rig}
                label="Catbo - tap the head, nose, paw, belly, tail or feet"
                onClick={onCatClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    touch("body", mouthPoint());
                  }
                }}
                className="w-full drop-shadow-[0_12px_18px_rgba(0,30,46,0.25)]"
              />
            </div>

            {/* Food flying to the mouth */}
            {flying.map((item) => (
              <motion.span
                key={item.id}
                className="absolute left-0 top-0 z-30 text-[34px] leading-none pointer-events-none"
                style={{ marginLeft: -17, marginTop: -17 }}
                initial={{ x: item.from.x, y: item.from.y, scale: 1, rotate: 0 }}
                animate={{
                  x: [item.from.x, (item.from.x + item.to.x) / 2, item.to.x],
                  y: [item.from.y, Math.min(item.from.y, item.to.y) - 90, item.to.y],
                  scale: [1, 1.25, 0.35],
                  rotate: [0, 200, 360],
                }}
                transition={{ duration: 0.65, ease: "easeInOut" }}
                onAnimationComplete={() => onFoodArrived(item)}
              >
                {item.emoji}
              </motion.span>
            ))}

            {/* Hearts / sparkles */}
            <AnimatePresence>
              {particles.map((p) => (
                <motion.span
                  key={p.id}
                  className="absolute left-0 top-0 z-30 text-[22px] leading-none pointer-events-none"
                  initial={{ x: p.x - 11, y: p.y - 11, opacity: 1, scale: 0.4 }}
                  animate={{ x: p.x - 11 + p.dx, y: p.y - 130, opacity: 0, scale: 1.2 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  {p.emoji}
                </motion.span>
              ))}
            </AnimatePresence>

            {/* Food tray */}
            <div className="absolute inset-x-0 bottom-0 z-20 bg-white/85 backdrop-blur-sm border-t border-navy/10 px-4 pt-2.5 pb-3.5">
              <p className="text-center text-[9px] tracking-[3px] uppercase text-navy/50 font-semibold mb-2">Tap or drag to feed</p>
              <div className="flex justify-center gap-2 md:gap-3">
                {FOODS.map((food) => (
                  <motion.button
                    key={food.name}
                    type="button"
                    aria-label={`Feed Catbo a ${food.name.toLowerCase()}`}
                    title={food.name}
                    drag
                    dragSnapToOrigin
                    dragElastic={1}
                    dragMomentum={false}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.9 }}
                    whileDrag={{ scale: 1.3, zIndex: 40 }}
                    onTap={(e) => {
                      const r = (e.target as HTMLElement).closest("button")!.getBoundingClientRect();
                      feed(food, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
                    }}
                    onDragEnd={(_, info) => onFoodDragEnd(food, info)}
                    style={{ touchAction: "none" }}
                    className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl bg-cream border border-navy/10 shadow-sm text-[26px] md:text-[30px] cursor-grab active:cursor-grabbing"
                  >
                    {food.emoji}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls: mic, dance, tummy */}
        <div className="lg:col-start-1 lg:row-start-2 self-start flex flex-col items-center lg:items-start gap-6">
          <div className="flex flex-wrap justify-center lg:justify-start items-center gap-x-8 gap-y-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                {micOn && !reduceMotion && (
                  <motion.span
                    className={`absolute inset-0 rounded-full ${mood === "hearing" ? "bg-[#e4473a]" : "bg-ocean"}`}
                    animate={{ scale: [1, 1.6], opacity: [0.45, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <motion.button
                  type="button"
                  onClick={micOn ? stopMic : startMic}
                  aria-pressed={micOn}
                  aria-label={micOn ? "Stop talking to Catbo" : "Talk to Catbo"}
                  whileTap={{ scale: 0.92 }}
                  className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-xl transition-colors duration-300 ${
                    micOn ? (mood === "hearing" ? "bg-[#e4473a] text-white" : "bg-ocean text-navy") : "bg-navy text-white hover:bg-ocean hover:text-navy"
                  }`}
                >
                  {micOn ? <MicOff size={28} /> : <Mic size={28} />}
                </motion.button>
              </div>
              <div>
                <p className="font-[family-name:var(--font-outfit)] text-navy text-[17px] font-semibold">{micLabel}</p>
                <p className="text-[12px] text-navy/55">{micOn ? "Tap again to stop" : "Catbo repeats what you say"}</p>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={dancing ? () => stopDance(false) : startDance}
              aria-pressed={dancing}
              whileTap={{ scale: 0.94 }}
              className={`inline-flex items-center gap-2.5 h-[52px] px-6 rounded-full shadow-lg text-[11px] font-semibold tracking-[2px] uppercase transition-colors duration-300 ${
                dancing ? "bg-[#e4473a] text-white" : "bg-white text-navy border border-navy/15 hover:bg-navy hover:text-white"
              }`}
            >
              {dancing ? <Square size={16} /> : <Music size={18} />}
              {dancing ? "Stop" : "Dance"}
            </motion.button>
          </div>
          {micError && <p className="text-[13px] text-[#c0392b] -mt-2">{micError}</p>}

          {/* Tummy meter */}
          <div className="w-full max-w-[320px]">
            <div className="flex justify-between text-[10px] tracking-[3px] uppercase text-navy/60 font-semibold mb-2">
              <span>Tummy</span>
              <span>{tummy}%</span>
            </div>
            <div className="h-3 rounded-full bg-navy/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-ocean to-navy"
                animate={{ width: `${tummy}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
