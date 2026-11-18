"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronsDown, ChevronsUp, Fish, Flag, Gift, Loader2, MessageCircle, Play, RotateCcw, ShieldCheck, Ticket, Trophy, X } from "lucide-react";
import type { Race, RaceState } from "./race";
import { devGameCode, getClaim, keepClaimScore, startClaimChance, submitClaimScore, verifyClaimCode } from "./claims";
import { whatsapp, WHATSAPP_DISPLAY } from "@/lib/whatsapp";
import { chancesText, checkPlayer, type RaceScore, CLAIM_CHANCES, formatPercent, OTP_REQUEST_TEXT, RULES, type ClaimView } from "@/lib/game-claims";
import { dubaiNow } from "@/lib/bookings";

// The Catbo Racing popup, opened from the peeking cat's "Click to play" (CatFishGrab.tsx). It is
// loaded only then, with the game (race.ts) and its pictures (/public/race), so the pages carry
// none of it. A tap, a click or Space jumps; Escape or X closes.
//
// First the visitor chooses: play free (as often as they like), or play for a discount on their
// bill (rules: src/lib/game-claims.ts): a short form (name, phone), then they send "GET OTP" to our
// WhatsApp and type back the code it replies with (proving the number is theirs), then their race(s) for the day (CLAIM_CHANCES), the latest
// score counting, and a code to show at the till. The claim is remembered on this device for the
// day, so closing the game and coming back carries on with it.

type Mode = "choose" | "free" | "register" | "claim";
const CLAIM_KEY = "catbo-claim"; // this device's claim today: { id, day }

const readStoredClaim = () => {
  try {
    const v = JSON.parse(localStorage.getItem(CLAIM_KEY) || "null");
    return v && v.day === dubaiNow().date && typeof v.id === "string" ? (v.id as string) : null;
  } catch {
    return null;
  }
};
// A server call that takes too long (a bad connection) stops being waited for: the customer sees a
// message and can try again, instead of a button spinning for a minute
const ANSWER_MS = 20_000;
const inTime = <T,>(call: Promise<T>) =>
  Promise.race([call, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ANSWER_MS))]);
// The country code in front of the number, chosen in the form (UAE first). A number typed with
// its own + code is used as it is. Without one, a number like 9562xx9404 (India) would be read as
// a +956 number, and the WhatsApp code would go nowhere
// [code, flag, name]: the box shows the flag and code; the list it opens shows the names too
const COUNTRIES = [
  ["971", "🇦🇪", "UAE"],
  ["91", "🇮🇳", "India"],
  ["92", "🇵🇰", "Pakistan"],
  ["880", "🇧🇩", "Bangladesh"],
  ["63", "🇵🇭", "Philippines"],
  ["94", "🇱🇰", "Sri Lanka"],
  ["977", "🇳🇵", "Nepal"],
  ["966", "🇸🇦", "Saudi Arabia"],
  ["968", "🇴🇲", "Oman"],
  ["974", "🇶🇦", "Qatar"],
  ["965", "🇰🇼", "Kuwait"],
  ["973", "🇧🇭", "Bahrain"],
  ["20", "🇪🇬", "Egypt"],
  ["44", "🇬🇧", "UK"],
  ["1", "🇺🇸", "USA / Canada"],
] as const;
const fullNumber = (country: string, typed: string) => {
  const t = typed.trim();
  if (t.startsWith("+") || t.startsWith("00")) return t;
  return `+${country} ${t.replace(/^0+/, "")}`; // the local 0 (050 ...) goes
};

const SLOW = "No answer from our server. Please check your internet connection and try again.";

const storeClaim = (id: string) => {
  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify({ id, day: dubaiNow().date }));
  } catch {}
};
export default function CatboRace({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raceRef = useRef<Race | null>(null);
  const [state, setState] = useState<RaceState | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [claim, setClaim] = useState<ClaimView | null>(null);
  const [pendingChance, setPendingChance] = useState<number | null>(null); // a claim race running, its score not yet sent
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the registration form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<string>(COUNTRIES[0][0]);
  const [offers, setOffers] = useState(false);
  const [website, setWebsite] = useState(""); // hidden: only bots fill it
  const formOpenedAt = useRef(0);
  // the WhatsApp code step: the number it is for (null = not there yet), and the code typed
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const sentChance = useRef<number | null>(null);

  // A claim this device registered earlier today comes back (its chances, or its code)
  useEffect(() => {
    const id = readStoredClaim();
    if (id) getClaim(id).then((res) => res.ok && setClaim(res.claim)).catch(() => {});
  }, []);

  // Free play: a tap, a click or Space starts and restarts races. For a discount only the buttons do
  const loaded = state !== null; // (the race is set up once its first state arrives)
  useEffect(() => {
    raceRef.current?.setAutoStart(mode === "free");
  }, [mode, loaded]);

  // A claim race has ended: its score goes to the server (once)
  useEffect(() => {
    if (state?.phase !== "over" || mode !== "claim" || !claim || pendingChance === null || sentChance.current === pendingChance) return;
    // the race's record (every jump and cast); the server replays it and decides the score
    const record = raceRef.current?.replay();
    if (!record) return;
    sentChance.current = pendingChance;
    setBusy(true);
    inTime(submitClaimScore(claim.claimId, pendingChance, { W: record.W, H: record.H, inputs: record.inputs }))
      .then((res) => {
        if (res.ok) setClaim(res.claim);
        else setError(res.error);
      })
      .catch(() => setError("Your score could not be saved. Please check your connection."))
      .finally(() => {
        setPendingChance(null);
        setBusy(false);
      });
  }, [state?.phase, state?.fish, state?.metres, mode, claim, pendingChance]);

  const playFree = () => {
    setError(null);
    setMode("free");
    raceRef.current?.setAutoStart(true);
    raceRef.current?.start();
  };
  const chooseClaim = () => {
    setError(null);
    if (claim) return setMode("claim");
    formOpenedAt.current = Date.now();
    setMode("register");
  };
  // Step 1: name and number are checked, then WhatsApp opens with "GET OTP" typed, to send to us.
  // Our reply in that chat is the code (src/lib/game-otp.ts). Opened during the click, so the
  // browser doesn't block it as a popup
  const openWhatsApp = () => window.open(whatsapp(OTP_REQUEST_TEXT), "_blank", "noopener");
  const getCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    const number = fullNumber(country, phone);
    const problem = checkPlayer({ name, phone: number, offers });
    if (problem) return setError(problem);
    setError(null);
    openWhatsApp();
    setOtp("");
    setSentTo(number.replace(/\s+/g, " "));
    devGameCode(number).catch(() => {}); // on a developer's computer only: the code shows in the terminal
  };
  // Step 2: the code typed back opens the claim
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await inTime(verifyClaimCode({ name, phone: fullNumber(country, phone), offers }, otp, { hp: website, ms: Date.now() - formOpenedAt.current }));
      if (!res.ok) return setError(res.error);
      storeClaim(res.claim.claimId);
      setClaim(res.claim);
      setSentTo(null);
      setMode("claim");
    } catch {
      setError(SLOW);
    } finally {
      setBusy(false);
    }
  };
  const startChance = async () => {
    if (!claim) return;
    setBusy(true);
    setError(null);
    try {
      const res = await inTime(startClaimChance(claim.claimId));
      if (!res.ok) return setError(res.error);
      setClaim(res.claim);
      sentChance.current = null;
      setPendingChance(res.claim.chancesUsed);
      raceRef.current?.setAutoStart(false);
      raceRef.current?.start(res.seed); // the server's seed: the race it will replay
    } catch {
      setError(SLOW);
    } finally {
      setBusy(false);
    }
  };
  // The customer picks one of their races for the discount (one only)
  const keepScore = async (chance?: number) => {
    if (!claim) return;
    setBusy(true);
    try {
      const res = await inTime(keepClaimScore(claim.claimId, chance));
      if (res.ok) setClaim(res.claim);
      else setError(res.error);
    } catch {
      setError(SLOW);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    import("./race")
      .then(({ startRace }) => startRace(canvasRef.current!, setState))
      .then((race) => {
        if (cancelled) return race.destroy();
        raceRef.current = race;
        // Development only: lets an automated test drive real races and compare them with the server's replay
        if (process.env.NODE_ENV !== "production") (window as unknown as { __catboRace?: Race }).__catboRace = race;
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      raceRef.current?.destroy();
      raceRef.current = null;
    };
  }, []);

  // The page behind does not scroll; Space jumps, Escape closes
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return; // typing in the form
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        raceRef.current?.jump();
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        raceRef.current?.cast();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // The X in a card's corner: closes the game (like the X at the top, which a card can cover on a phone)
  const closeX = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      aria-label="Close the game"
      className="absolute right-2.5 top-2.5 w-9 h-9 rounded-full flex items-center justify-center text-navy/55 hover:bg-navy/5 hover:text-navy transition-colors"
    >
      <X size={18} aria-hidden />
    </button>
  );
  const card = "relative bg-cream rounded-2xl px-4 py-5 sm:px-6 sm:py-6 md:px-7 md:py-7 text-center shadow-2xl max-w-sm w-full my-auto";
  const buttonAlt =
    "inline-flex items-center justify-center gap-2 bg-white text-navy border-2 border-navy rounded-full px-4 sm:px-7 py-2.5 sm:py-3 text-[11px] sm:text-[12px] tracking-[1.5px] sm:tracking-[3px] whitespace-nowrap uppercase font-bold hover:bg-ocean hover:border-ocean transition-colors disabled:opacity-60";
  const field = "w-full rounded-lg border border-navy/20 bg-white px-3.5 py-2.5 text-[16px] text-navy placeholder:text-navy/35 focus:outline-none focus:ring-2 focus:ring-ocean/50";
  const button =
    "inline-flex items-center justify-center gap-2 bg-navy text-cream rounded-full px-4 sm:px-7 py-3 sm:py-3.5 text-[11px] sm:text-[12px] tracking-[1.5px] sm:tracking-[3px] whitespace-nowrap uppercase font-bold hover:bg-ocean hover:text-navy transition-colors";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Catbo Racing"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/60 backdrop-blur-sm p-0 md:p-6 font-jost"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full mx-3 h-[78dvh] rounded-3xl md:mx-0 md:h-auto md:max-w-5xl md:aspect-video overflow-hidden bg-[#f7e6d5] shadow-2xl">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none select-none"
          onPointerDown={(e) => {
            if (e.button === 0) raceRef.current?.jump();
          }}
        />
        {!state && !failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f7e6d5]">
            <Loader2 className="animate-spin text-navy" size={40} aria-label="Loading the race" />
          </div>
        )}

        {/* "Tap to jump" at the start of a race */}
        {state?.phase === "racing" && (
          <div
            aria-hidden={!state.hint}
            className={`absolute left-[44%] bottom-[31%] md:left-[40%] md:bottom-[56%] pointer-events-none transition-all duration-300 ${
              state.hint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white text-navy pl-2.5 pr-3.5 py-2 text-[13px] md:text-[15px] font-bold shadow-[0_6px_18px_-6px_rgba(0,48,73,0.55)] motion-safe:animate-bounce">
              <span className="w-6 h-6 rounded-full bg-offer text-white flex items-center justify-center">
                <ChevronsUp size={15} aria-hidden />
              </span>
              <span className="md:hidden">Tap to jump!</span>
              <span className="hidden md:inline">Press Space to jump!</span>
            </span>
          </div>
        )}

        {/* "Tap to fish" after that: by the fish button on a phone, near Catbo on a computer */}
        {state?.phase === "racing" && (
          <div
            aria-hidden={!state.fishHint}
            className={`absolute right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+4.75rem)] md:right-auto md:left-[40%] md:bottom-[56%] pointer-events-none transition-all duration-300 ${
              state.fishHint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <span className="relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white text-navy pl-2.5 pr-3.5 py-2 text-[13px] md:text-[15px] font-bold shadow-[0_6px_18px_-6px_rgba(0,48,73,0.55)] motion-safe:animate-bounce">
              <span className="w-6 h-6 rounded-full bg-ocean text-white flex items-center justify-center">
                <ChevronsDown size={15} aria-hidden />
              </span>
              <span className="md:hidden">Tap to fish!</span>
              <span className="hidden md:inline">Press ↓ to fish!</span>
              <span aria-hidden className="md:hidden absolute -bottom-1.5 right-6 w-3 h-3 rotate-45 bg-white" />
            </span>
          </div>
        )}

        {/* On a phone: a button to drop Catbo's line (on a computer, the down arrow) */}
        {state?.phase === "racing" && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              raceRef.current?.cast();
            }}
            aria-label="Drop the fishing line"
            className="md:hidden absolute right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] w-16 h-16 rounded-full shadow-[0_6px_18px_-6px_rgba(0,48,73,0.6)] active:scale-95 transition-transform touch-none"
          >
            {/* the restaurant's hook-and-fish artwork: a white disc in a navy ring */}
            <img src="/catbo/fish-hook.webp" alt="" width={64} height={64} draggable={false} className="w-full h-full pointer-events-none select-none" />
          </button>
        )}

        {/* Distance and fish caught; the way out */}
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 md:inset-x-5 flex items-start justify-between gap-2 pointer-events-none">
          {state ? (
            <div className="flex flex-wrap gap-2 text-navy font-bold text-[14px] md:text-[16px]">
              <span className="inline-flex items-center gap-1.5 bg-white/90 rounded-full px-3.5 py-2 shadow-sm tabular-nums">
                <Flag size={16} aria-hidden /> {state.metres} m
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/90 rounded-full px-3.5 py-2 shadow-sm tabular-nums" aria-label={`${state.fish} fish caught`}>
                <Fish size={16} aria-hidden /> {state.fish}
              </span>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the race"
            className="pointer-events-auto w-10 h-10 shrink-0 rounded-full bg-white/90 text-navy shadow flex items-center justify-center hover:bg-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Before the race, and after it. In free play a tap or click anywhere (or Space) starts the
            next race; for a discount only the buttons do */}
        {state && state.phase !== "racing" && (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-navy/30 p-3 sm:p-4 overflow-y-auto ${mode === "free" ? "cursor-pointer" : ""}`}
            onClick={() => mode === "free" && raceRef.current?.jump()}
          >
            {mode === "choose" && state.phase === "ready" && (
              <div className={card} role="status">
                {closeX}
                <p className="text-[10px] tracking-[3px] sm:tracking-[4px] uppercase text-ocean font-bold mb-2">Catbo Racing</p>
                <p className="font-playfair text-[22px] sm:text-[28px] leading-tight font-bold text-navy mb-3">Surf with Catbo!</p>
                <p className="text-navy/75 text-[12.5px] leading-snug mb-4 sm:text-[14px] sm:leading-normal sm:mb-5">
                  <span className="hidden md:inline">Click or press Space</span>
                  <span className="md:hidden">Tap the screen</span> to jump over buoys and diving gulls. Dolphins leap over you: don&rsquo;t jump into them! To fish, <span className="hidden md:inline">press ↓</span><span className="md:hidden">tap the hook button</span>. One hit and the race is over. It gets harder every 100 m, and more and more sea creatures swim among the fish: never hook an octopus, a jellyfish or a sea snake!
                </p>
                <div className="flex flex-col gap-2.5">
                  <button type="button" autoFocus className={button} onClick={playFree}>
                    <Play size={16} className="fill-current" aria-hidden /> Play free
                  </button>
                  <button type="button" className={buttonAlt} onClick={chooseClaim}>
                    <Gift size={16} aria-hidden /> {claim ? "My discount claim" : "Play for a discount"}
                  </button>
                  <p className="text-[11px] sm:text-[12px] leading-snug text-navy/60">Off your bill: {RULES} · {chancesText()} · one discount per bill</p>
                </div>
              </div>
            )}

            {mode === "register" && !sentTo && (
              <form className={`${card} text-left`} onSubmit={getCode} noValidate>
                {closeX}
                <p className="text-[10px] tracking-[3px] sm:tracking-[4px] uppercase text-ocean font-bold mb-2 text-center">Play for a discount</p>
                <p className="font-playfair text-[20px] sm:text-[24px] leading-tight font-bold text-navy mb-2 text-center">Register to play</p>
                <p className="text-navy/70 text-[12px] sm:text-[13px] leading-snug mb-3 sm:mb-4 text-center">
                  Catch fish for money off your bill: {RULES}. {CLAIM_CHANCES === 1 ? "You get 1 race today: make it count!" : `You get ${CLAIM_CHANCES} races today, then you choose which score to use (one discount).`}
                </p>
                <div aria-hidden className="absolute -left-[9999px] w-px h-px overflow-hidden">
                  <label htmlFor="c-website">Website</label>
                  <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <label htmlFor="c-name" className="block text-[11px] font-bold uppercase tracking-[2px] text-navy/70 mb-1">
                  Name <span className="text-offer">*</span>
                </label>
                <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Enter your name" maxLength={60} autoFocus className={field} />
                <label htmlFor="c-phone" className="block text-[11px] font-bold uppercase tracking-[2px] text-navy/70 mt-3 mb-1">
                  Phone number <span className="text-offer">*</span>
                </label>
                {/* One row on every screen: a compact country box (flag and code; the real list opens on
                    top of it with the country names) and the number taking the rest of the width */}
                <div className="flex items-stretch gap-2">
                  <div className="relative shrink-0 w-[5.75rem] sm:w-[6.75rem]">
                    <span
                      aria-hidden
                      className="pointer-events-none flex h-full items-center justify-between gap-1 rounded-lg border border-navy/20 bg-white pl-2.5 pr-1.5 sm:pl-3 sm:pr-2 text-[15px] sm:text-[16px] text-navy"
                    >
                      <span className="whitespace-nowrap">
                        {COUNTRIES.find(([code]) => code === country)?.[1]} +{country}
                      </span>
                      <ChevronDown size={15} className="shrink-0 text-navy/50" />
                    </span>
                    <label htmlFor="c-country" className="sr-only">Country code</label>
                    <select
                      id="c-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    >
                      {COUNTRIES.map(([code, flag, label]) => (
                        <option key={code} value={code}>
                          {flag} {label} (+{code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel-national" required placeholder="Enter your number" maxLength={20} className={`${field} flex-1 min-w-0 px-3 placeholder:text-[14px] sm:px-3.5 sm:placeholder:text-[16px]`} />
                </div>
                <label className="flex items-start gap-2.5 mt-3 text-[13px] text-navy/80 cursor-pointer">
                  <input type="checkbox" checked={offers} onChange={(e) => setOffers(e.target.checked)} className="mt-0.5 w-4 h-4 accent-navy shrink-0" />
                  <span>Send me Boat Seafood offers on WhatsApp (reply STOP any time)</span>
                </label>
                {/* What the details are for (UAE data protection: people are told before they give them) */}
                <p className="mt-2 text-[11px] leading-snug text-navy/55">
                  We use your name and number only for this game and your discount, and for our offers if you tick the box. We never share them.
                </p>
                {error && <p role="alert" className="mt-3 text-[13px] text-offer font-semibold">{error}</p>}
                <div className="flex flex-col gap-2 mt-5">
                  <button type="submit" disabled={busy} className={`${button} disabled:opacity-60`}>
                    <MessageCircle size={16} aria-hidden /> Get code on WhatsApp
                  </button>
                  <p className="text-[12px] text-navy/60 text-center leading-snug">WhatsApp opens with &ldquo;{OTP_REQUEST_TEXT}&rdquo; ready: send it to us from this number, and we reply with your code.</p>
                  <button type="button" className="text-[12px] text-navy/60 underline underline-offset-2 hover:text-navy" onClick={() => { setError(null); setMode("choose"); }}>
                    Back
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: the code from WhatsApp */}
            {mode === "register" && sentTo && (
              <form className={card} onSubmit={verify} noValidate>
                {closeX}
                <p className="text-[10px] tracking-[3px] sm:tracking-[4px] uppercase text-ocean font-bold mb-2">Play for a discount</p>
                <p className="font-playfair text-[20px] sm:text-[24px] leading-tight font-bold text-navy mb-2">Enter your code</p>
                <ol className="text-navy/75 text-[12.5px] sm:text-[13px] leading-snug mb-4 text-left list-decimal pl-5 space-y-1">
                  <li>
                    In WhatsApp, send <b>{OTP_REQUEST_TEXT}</b> to Boat Seafood{WHATSAPP_DISPLAY ? <> (<span className="whitespace-nowrap">{WHATSAPP_DISPLAY}</span>)</> : null} from <b className="whitespace-nowrap">{sentTo}</b>.
                  </li>
                  <li>We reply with a 6-digit code. Type it here.</li>
                </ol>
                <label htmlFor="c-otp" className="sr-only">6-digit code</label>
                <input
                  id="c-otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  placeholder="Enter the code"
                  maxLength={6}
                  autoFocus
                  className={`${field} text-center text-[24px] tracking-[10px] font-semibold placeholder:text-[15px] placeholder:tracking-normal placeholder:font-normal`}
                />
                {error && <p role="alert" className="mt-3 text-[13px] text-offer font-semibold">{error}</p>}
                <div className="flex flex-col gap-2 mt-5">
                  <button type="submit" disabled={busy || otp.length !== 6} className={`${button} disabled:opacity-60`}>
                    {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ShieldCheck size={16} aria-hidden />} Verify and play
                  </button>
                  <div className="flex items-center justify-center gap-4 text-[12px]">
                    <button type="button" disabled={busy} onClick={openWhatsApp} className="text-navy/70 underline underline-offset-2 hover:text-navy">
                      Open WhatsApp again
                    </button>
                    <button type="button" disabled={busy} onClick={() => { setError(null); setSentTo(null); setOtp(""); }} className="text-navy/70 underline underline-offset-2 hover:text-navy">
                      Change number
                    </button>
                  </div>
                </div>
              </form>
            )}

            {mode === "claim" && claim && <ClaimCard claim={claim} busy={busy || pendingChance !== null} error={error} raceOver={state.phase === "over"} onStart={startChance} onKeep={keepScore} onFree={playFree} card={card} button={button} buttonAlt={buttonAlt} closeX={closeX} />}

            {mode === "free" && state.phase === "over" && (
              <div className={card} role="status">
                {closeX}
                <p className="text-[10px] tracking-[3px] sm:tracking-[4px] uppercase text-offer font-bold mb-2">Race over</p>
                {state.cause && <p className="text-navy font-semibold text-[15px] mb-2">{state.cause}</p>}
                <p className="font-playfair text-4xl sm:text-5xl font-bold text-navy mb-1">{state.metres} m</p>
                <p className="flex items-center justify-center gap-1.5 text-navy/75 text-[14px] mb-3">
                  <Fish size={15} aria-hidden /> {state.fish} fish caught
                </p>
                <p className="inline-flex items-center gap-1.5 text-navy text-[13px] font-semibold mb-6">
                  <Trophy size={15} aria-hidden /> Best: {state.best} m
                </p>
                <div className="flex flex-col gap-2.5">
                  <button type="button" autoFocus className={button}>
                    <RotateCcw size={16} aria-hidden /> Race again
                  </button>
                  <button type="button" className={buttonAlt} onClick={(e) => { e.stopPropagation(); chooseClaim(); }}>
                    <Gift size={16} aria-hidden /> {claim ? "My discount claim" : "Play for a discount"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="bg-white rounded-xl px-5 py-3 text-navy">The race could not load. Please try again.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// The discount claim: before the first race, between races (claim this score, or race again), the
// choice between races when all are played (one discount only), and then the code for the till
function ClaimCard({
  claim: c,
  busy,
  error,
  raceOver,
  onStart,
  onKeep,
  onFree,
  card,
  button,
  buttonAlt,
  closeX,
}: {
  claim: ClaimView;
  busy: boolean;
  error: string | null;
  raceOver: boolean;
  onStart: () => void;
  onKeep: (chance?: number) => void;
  onFree: () => void;
  card: string;
  button: string;
  buttonAlt: string;
  closeX: React.ReactNode;
}) {
  const finished = c.status !== "open" || c.locked; // a score is chosen (or the claim is used or expired)
  const choosing = !finished && c.chancesLeft === 0 && c.scores.length > 1; // every race played: pick one
  const between = !finished && c.chancesLeft > 0 && c.scores.length > 0; // a race played, one more to go
  const fresh = !finished && c.scores.length === 0 && c.chancesLeft > 0; // no race yet
  const nothing = !finished && c.chancesLeft === 0 && c.scores.length <= 1; // all used; one score or none
  const saving = busy && raceOver && c.scores.length < c.chancesUsed;
  const best = c.scores.reduce<RaceScore | null>((b, r) => (!b || r.fish > b.fish ? r : b), null);
  const latest = c.scores[c.scores.length - 1];
  const valid = new Date(c.expiresAt).toLocaleDateString([], { day: "numeric", month: "short" });

  // a race's score, as a line: "Race 1 · 12 fish · 3% off"
  const scoreLine = (r: RaceScore) => (
    <>
      <span className="font-semibold">Race {r.chance}</span>
      <span className="text-navy/60"> · {r.fish} fish · </span>
      <span className="font-bold">{formatPercent(r.percent)}% off</span>
    </>
  );

  return (
    <div className={card} role="status" onClick={(e) => e.stopPropagation()}>
      {closeX}
      <p className="text-[10px] tracking-[3px] sm:tracking-[4px] uppercase text-ocean font-bold mb-2">Your discount claim</p>
      {saving ? (
        <p className="flex items-center justify-center gap-2 text-navy py-6"><Loader2 size={18} className="animate-spin" aria-hidden /> Saving your score…</p>
      ) : (
        <>
          {fresh && (
            <>
              <p className="font-playfair text-[20px] sm:text-[24px] leading-tight font-bold text-navy mb-2">Good luck, {c.name}!</p>
              <p className="text-navy/70 text-[12.5px] sm:text-[13px] leading-snug mb-4">
                {RULES}. You have {c.chancesLeft} {c.chancesLeft === 1 ? "race" : "races"}: after them, you choose which score to use. One discount only. Stay in the game until each race ends: a paused race doesn&rsquo;t count.
              </p>
              <button type="button" autoFocus className={`${button} w-full`} disabled={busy} onClick={onStart}>
                {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} className="fill-current" aria-hidden />}
                Start race {c.chancesUsed + 1}
              </button>
            </>
          )}

          {between && latest && (
            <>
              <p className="flex items-center justify-center gap-2 text-navy/75 text-[14px]">
                <Fish size={15} aria-hidden /> Race {latest.chance} of {CLAIM_CHANCES}: {latest.fish} fish
              </p>
              <p className="font-playfair text-4xl sm:text-5xl font-bold text-navy my-1">{formatPercent(latest.percent)}% off</p>
              <p className="text-navy/70 text-[12.5px] sm:text-[13px] leading-snug mt-2 mb-4">
                Keep this score, or play {c.chancesLeft === 1 ? "your last race" : "again"}: this score stays saved, and you choose the one you want afterwards.
              </p>
              <div className="flex flex-col gap-2.5">
                {latest.percent > 0 && (
                  <button type="button" className={button} disabled={busy} onClick={() => onKeep(latest.chance)}>
                    <Ticket size={16} aria-hidden /> Claim this score
                  </button>
                )}
                <button type="button" autoFocus className={latest.percent > 0 ? buttonAlt : button} disabled={busy} onClick={onStart}>
                  {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} className="fill-current" aria-hidden />}
                  Play race {c.chancesUsed + 1}
                </button>
              </div>
            </>
          )}

          {choosing && (
            <>
              <p className="font-playfair text-[20px] sm:text-[24px] leading-tight font-bold text-navy mb-1">Choose your discount</p>
              <p className="text-navy/70 text-[12.5px] sm:text-[13px] leading-snug mb-3">One discount only: pick the race you want to use.</p>
              <div className="flex flex-col gap-2">
                {c.scores.map((r) => (
                  <button
                    key={r.chance}
                    type="button"
                    disabled={busy || r.percent <= 0}
                    onClick={() => onKeep(r.chance)}
                    className={`flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-left text-[14px] text-navy transition-colors disabled:opacity-50 ${
                      best?.chance === r.chance ? "border-navy bg-white" : "border-navy/20 bg-white/70 hover:border-navy/50"
                    }`}
                  >
                    <span>{scoreLine(r)}</span>
                    {best?.chance === r.chance && <span className="shrink-0 rounded-full bg-navy text-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-[1px]">Best</span>}
                  </button>
                ))}
              </div>
              {best && best.percent <= 0 && <p className="text-navy text-[13px] mt-3">No fish caught: no discount this time. Come back tomorrow!</p>}
            </>
          )}

          {nothing && (
            <div className="mt-1">
              {best && best.percent > 0 ? (
                <>
                  <p className="text-navy/75 text-[14px]">{scoreLine(best)}</p>
                  <button type="button" className={`${button} w-full mt-3`} disabled={busy} onClick={() => onKeep(best.chance)}>
                    <Ticket size={16} aria-hidden /> Claim this score
                  </button>
                </>
              ) : (
                <p className="text-navy text-[14px]">No discount this time. Come back tomorrow for new races!</p>
              )}
            </div>
          )}

          {finished && (
            <div className="mt-1">
              {c.status === "used" ? (
                <p className="text-navy text-[14px]">This discount has been used on your bill. Thank you! Play for a new one tomorrow.</p>
              ) : c.status === "expired" ? (
                <p className="text-navy text-[14px]">This claim has expired. Play for a new one any day.</p>
              ) : c.percent > 0 ? (
                <>
                  {c.chosen && <p className="text-navy/70 text-[13px]">Your choice: Race {c.chosen} · {c.fish} fish</p>}
                  <p className="font-playfair text-4xl sm:text-5xl font-bold text-navy my-1">{formatPercent(c.percent)}% off</p>
                  <p className="text-navy/75 text-[13px] mb-1">Show this code when you pay:</p>
                  <p className="font-mono text-[28px] sm:text-[34px] font-bold tracking-[4px] sm:tracking-[6px] text-navy bg-white rounded-xl py-2 mb-1 select-all">{c.code}</p>
                  <p className="text-navy/60 text-[12px]">Valid until {valid} · one discount per bill: in a group, use one person&rsquo;s code</p>
                </>
              ) : (
                <p className="text-navy text-[14px]">No discount this time. Come back tomorrow for new races!</p>
              )}
            </div>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-[13px] text-offer font-semibold">{error}</p>}
      <button type="button" className="mt-4 text-[12px] text-navy/60 underline underline-offset-2 hover:text-navy" onClick={onFree} disabled={busy}>
        Play free instead
      </button>
    </div>
  );
}
