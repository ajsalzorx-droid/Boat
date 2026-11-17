"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronsDown, ChevronsUp, Fish, Flag, Gift, Loader2, MessageCircle, Play, RotateCcw, ShieldCheck, Ticket, Trophy, X } from "lucide-react";
import type { Race, RaceState } from "./race";
import { getClaim, keepClaimScore, sendClaimCode, startClaimChance, submitClaimScore, verifyClaimCode } from "./claims";
import { CLAIM_CHANCES, FISH_FOR_MAX, formatPercent, MAX_DISCOUNT_PERCENT, RULES, type ClaimView } from "@/lib/game-claims";
import { dubaiNow } from "@/lib/bookings";

// The Catbo Racing popup, opened from the peeking cat's "Click to play" (CatFishGrab.tsx). It is
// loaded only then, with the game (race.ts) and its pictures (/public/race), so the pages carry
// none of it. A tap, a click or Space jumps; Escape or X closes.
//
// First the visitor chooses: play free (as often as they like), or play for a discount on their
// bill (rules: src/lib/game-claims.ts): a short form (name, phone), a code sent to that number on
// WhatsApp to prove it is theirs, then 2 chances, the latest
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
  const [offers, setOffers] = useState(false);
  const [website, setWebsite] = useState(""); // hidden: only bots fill it
  const formOpenedAt = useRef(0);
  // the WhatsApp code step: where it went (null = not sent yet), what was typed, when "Send again" works
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!sentTo) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentTo]);
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
    sentChance.current = pendingChance;
    setBusy(true);
    inTime(submitClaimScore(claim.claimId, pendingChance, state.fish, state.metres))
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
  // Step 1: name and number; a 6-digit code goes to that number on WhatsApp
  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await inTime(sendClaimCode({ name, phone, offers }, { hp: website, ms: Date.now() - formOpenedAt.current }));
      if (!res.ok) return setError(res.error);
      setSentTo(res.sentTo);
      setOtp("");
      setResendAt(Date.now() + res.resendInSeconds * 1000);
    } catch {
      setError(SLOW);
    } finally {
      setBusy(false);
    }
  };
  // Step 2: the code typed back opens the claim
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await inTime(verifyClaimCode(phone, otp));
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
      raceRef.current?.start();
    } catch {
      setError(SLOW);
    } finally {
      setBusy(false);
    }
  };
  const keepScore = async () => {
    if (!claim) return;
    setBusy(true);
    try {
      const res = await inTime(keepClaimScore(claim.claimId));
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
  const card = "relative bg-cream rounded-2xl px-6 py-6 md:px-7 md:py-7 text-center shadow-2xl max-w-sm w-full my-auto";
  const buttonAlt =
    "inline-flex items-center justify-center gap-2 bg-white text-navy border-2 border-navy rounded-full px-7 py-3 text-[12px] tracking-[3px] uppercase font-bold hover:bg-ocean hover:border-ocean transition-colors disabled:opacity-60";
  const field = "w-full rounded-lg border border-navy/20 bg-white px-3.5 py-2.5 text-[15px] text-navy placeholder:text-navy/35 focus:outline-none focus:ring-2 focus:ring-ocean/50";
  const button =
    "inline-flex items-center justify-center gap-2 bg-navy text-cream rounded-full px-7 py-3.5 text-[12px] tracking-[3px] uppercase font-bold hover:bg-ocean hover:text-navy transition-colors";

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
            className="md:hidden absolute right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] w-16 h-16 rounded-full bg-white/95 text-navy shadow-[0_6px_18px_-6px_rgba(0,48,73,0.6)] border-4 border-white flex flex-col items-center justify-center active:scale-95 touch-none"
          >
            <span className="text-[22px] leading-none" aria-hidden>
              🎣
            </span>
            <ChevronsDown size={16} aria-hidden className="-mt-0.5" />
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
            className={`absolute inset-0 flex items-center justify-center bg-navy/30 p-4 overflow-y-auto ${mode === "free" ? "cursor-pointer" : ""}`}
            onClick={() => mode === "free" && raceRef.current?.jump()}
          >
            {mode === "choose" && state.phase === "ready" && (
              <div className={card} role="status">
                {closeX}
                <p className="text-[10px] tracking-[4px] uppercase text-ocean font-bold mb-2">Catbo Racing</p>
                <p className="font-playfair text-[28px] leading-tight font-bold text-navy mb-3">Surf with Catbo!</p>
                <p className="text-navy/75 text-[14px] mb-5">
                  <span className="hidden md:inline">Click or press Space</span>
                  <span className="md:hidden">Tap the screen</span> to jump over buoys. Dolphins leap over you: don&rsquo;t jump into them! To fish, <span className="hidden md:inline">press ↓</span><span className="md:hidden">tap 🎣</span>. One hit and the race is over. It gets harder every 100 m, and more and more sea creatures swim among the fish: never hook an octopus, a jellyfish or a sea snake!
                </p>
                <div className="flex flex-col gap-2.5">
                  <button type="button" autoFocus className={button} onClick={playFree}>
                    <Play size={16} className="fill-current" aria-hidden /> Play free
                  </button>
                  <button type="button" className={buttonAlt} onClick={chooseClaim}>
                    <Gift size={16} aria-hidden /> {claim ? "My discount claim" : "Play for a discount"}
                  </button>
                  <p className="text-[12px] text-navy/60">Off your bill: {RULES} · {CLAIM_CHANCES} chances a day</p>
                </div>
              </div>
            )}

            {mode === "register" && !sentTo && (
              <form className={`${card} text-left`} onSubmit={sendCode} noValidate>
                {closeX}
                <p className="text-[10px] tracking-[4px] uppercase text-ocean font-bold mb-2 text-center">Play for a discount</p>
                <p className="font-playfair text-[24px] leading-tight font-bold text-navy mb-2 text-center">Register to play</p>
                <p className="text-navy/70 text-[13px] mb-4 text-center">
                  Catch fish for money off your bill: {RULES}. You get {CLAIM_CHANCES} chances today, and your latest score counts.
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
                <input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" required placeholder="Enter your number" maxLength={20} className={field} />
                <label className="flex items-start gap-2.5 mt-3 text-[13px] text-navy/80 cursor-pointer">
                  <input type="checkbox" checked={offers} onChange={(e) => setOffers(e.target.checked)} className="mt-0.5 w-4 h-4 accent-navy shrink-0" />
                  <span>Send me Boat Seafood offers on WhatsApp (reply STOP any time)</span>
                </label>
                {error && <p role="alert" className="mt-3 text-[13px] text-offer font-semibold">{error}</p>}
                <div className="flex flex-col gap-2 mt-5">
                  <button type="submit" disabled={busy} className={`${button} disabled:opacity-60`}>
                    {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <MessageCircle size={16} aria-hidden />} Send code on WhatsApp
                  </button>
                  <p className="text-[12px] text-navy/60 text-center">We send a 6-digit code to this number on WhatsApp to check it is yours.</p>
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
                <p className="text-[10px] tracking-[4px] uppercase text-ocean font-bold mb-2">Play for a discount</p>
                <p className="font-playfair text-[24px] leading-tight font-bold text-navy mb-2">Enter your code</p>
                <p className="text-navy/70 text-[13px] mb-4">
                  We sent a 6-digit code on WhatsApp to <b className="whitespace-nowrap">{sentTo}</b>.
                </p>
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
                    <button type="button" disabled={busy || now < resendAt} onClick={() => sendCode()} className="text-navy/70 underline underline-offset-2 hover:text-navy disabled:no-underline disabled:text-navy/40">
                      {now < resendAt ? `Send again in ${Math.ceil((resendAt - now) / 1000)} s` : "Send again"}
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
                <p className="text-[10px] tracking-[4px] uppercase text-offer font-bold mb-2">Race over</p>
                {state.cause && <p className="text-navy font-semibold text-[15px] mb-2">{state.cause}</p>}
                <p className="font-playfair text-5xl font-bold text-navy mb-1">{state.metres} m</p>
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

// The discount claim between races: chances left, the latest score, and when done, the code
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
  onKeep: () => void;
  onFree: () => void;
  card: string;
  button: string;
  buttonAlt: string;
  closeX: React.ReactNode;
}) {
  const done = c.status !== "open" || c.chancesLeft === 0;
  const more = c.fish !== null ? Math.max(0, FISH_FOR_MAX - c.fish) : 0; // fish still to catch for the most
  const valid = new Date(c.expiresAt).toLocaleDateString([], { day: "numeric", month: "short" });
  return (
    <div className={card} role="status" onClick={(e) => e.stopPropagation()}>
      {closeX}
      <p className="text-[10px] tracking-[4px] uppercase text-ocean font-bold mb-2">Your discount claim</p>
      {busy && raceOver && c.fish === null ? (
        <p className="flex items-center justify-center gap-2 text-navy py-6"><Loader2 size={18} className="animate-spin" aria-hidden /> Saving your score…</p>
      ) : (
        <>
          {c.fish === null ? (
            <p className="font-playfair text-[24px] leading-tight font-bold text-navy mb-2">Good luck, {c.name}!</p>
          ) : (
            <>
              <p className="flex items-center justify-center gap-2 text-navy/75 text-[14px]">
                <Fish size={15} aria-hidden /> {done ? "Your score" : `Chance ${c.chancesUsed} of ${CLAIM_CHANCES}`}: {c.fish} fish
              </p>
              <p className="font-playfair text-5xl font-bold text-navy my-1">{formatPercent(c.percent)}% off</p>
              {more > 0 && !done && <p className="text-navy/70 text-[13px]">Every fish adds more: {FISH_FOR_MAX} fish give {MAX_DISCOUNT_PERCENT}% off.</p>}
            </>
          )}

          {!done && (
            <>
              <p className="text-navy/70 text-[13px] mt-2 mb-4">
                {c.fish === null
                  ? `${RULES}. You have ${c.chancesLeft} ${c.chancesLeft === 1 ? "chance" : "chances"}; your latest score counts.`
                  : `You have ${c.chancesLeft} more ${c.chancesLeft === 1 ? "chance" : "chances"}. If you play, your new score replaces this one, even if it is lower.`}
              </p>
              <div className="flex flex-col gap-2.5">
                {c.fish !== null && c.percent > 0 && (
                  <button type="button" className={button} disabled={busy} onClick={onKeep}>
                    <Ticket size={16} aria-hidden /> Claim this score
                  </button>
                )}
                <button type="button" autoFocus className={c.fish !== null && c.percent > 0 ? buttonAlt : button} disabled={busy} onClick={onStart}>
                  {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} className="fill-current" aria-hidden />}
                  {c.fish === null ? `Start chance ${c.chancesUsed + 1}` : c.chancesLeft === 1 ? "Play my last chance" : "Play again"}
                </button>
              </div>
            </>
          )}

          {done && (
            <div className="mt-3">
              {c.status === "used" ? (
                <p className="text-navy text-[14px]">This discount has been used on your bill. Thank you! Play for a new one tomorrow.</p>
              ) : c.status === "expired" ? (
                <p className="text-navy text-[14px]">This claim has expired. Play for a new one any day.</p>
              ) : c.percent > 0 ? (
                <>
                  <p className="text-navy/75 text-[13px] mb-1">Show this code when you pay:</p>
                  <p className="font-mono text-[34px] font-bold tracking-[6px] text-navy bg-white rounded-xl py-2 mb-1 select-all">{c.code}</p>
                  <p className="text-navy/60 text-[12px]">Valid until {valid} · one bill</p>
                </>
              ) : (
                <p className="text-navy text-[14px]">No discount this time. Come back tomorrow for {CLAIM_CHANCES} new chances!</p>
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
