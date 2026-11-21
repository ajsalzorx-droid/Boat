"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronsDown, ChevronsUp, Fish, Flag, Gift, Loader2, LocateFixed, MapPin, MessageCircle, Play, RotateCcw, ShieldCheck, Ticket, Trophy, X } from "lucide-react";
import type { Race, RaceState } from "./race";
import { CAUSES } from "./sim";
import { checkNumberToday, devGameCode, getClaim, keepClaimScore, startClaimChance, submitClaimScore, verifyClaimCode } from "./claims";
import { whatsapp, whatsappAndroid, whatsappApp, WHATSAPP_DISPLAY } from "@/lib/whatsapp";
import { chancesText, checkPlayer, type RaceScore, CLAIM_CHANCES, CLAIM_VALID_HOURS, checkSpot, DISCOUNT_TIERS, LOCATION_REQUIRED, discountFor, formatPercent, MIN_FISH, nextTier, OTP_REQUEST_TEXT, PLAY_AREA, RULES, type ClaimView, type PlayerSpot } from "@/lib/game-claims";
import { dubaiNow } from "@/lib/bookings";
import { COUNTRIES, fullNumber } from "@/lib/phone-countries";
import { Buoy, Dolphin, ElectricEel, Gull, Jelly, Octopus } from "./GuideArt";

// The Catbo Racing popup, opened from the peeking cat's "Click to play" (CatFishGrab.tsx). It is
// loaded only then, with the game (race.ts) and its pictures (/public/race), so the pages carry
// none of it. A tap, a click or Space jumps; Escape or X closes.
//
// First the visitor chooses: play free (as often as they like), or play for a discount on their
// bill (rules: src/lib/game-claims.ts): a short form (name, phone), then they send "GET OTP" to our
// WhatsApp and type back the code it replies with (proving the number is theirs), then their race(s) for the day (CLAIM_CHANCES), the latest
// score counting, and a code to show at the till. The claim is remembered on this device for the
// day, so closing the game and coming back carries on with it.

// "rules": the rules sheet, shown first every time the game opens; the game is reached only
// once the visitor ticks that they accept it
type Mode = "rules" | "choose" | "free" | "register" | "claim";
const CLAIM_KEY = "catbo-claim"; // this device's claim today: { id, day }
const ZAP_MS = 1600; // the shock plays this long before the race-over card shows

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
// The country code in front of the number, chosen in the form (UAE first): src/lib/phone-countries.ts

const SLOW = "No answer from our server. Please check your internet connection and try again.";

// The phone's location, for playing for a discount (only at the restaurant: checkSpot). Fails
// with a LocationError whose message tells the player what to do
class LocationError extends Error {}
const NO_LOCATION = "Your location could not be found. Turn on location (GPS) and try again. You can still play free!";
const locate = () =>
  new Promise<PlayerSpot>((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new LocationError("This browser can't share its location, so it can't play for a discount. You can still play free!"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) =>
        reject(
          new LocationError(
            err.code === err.PERMISSION_DENIED
              ? "Please allow location for this site: the discount game can only be played at Boat Seafood. You can still play free!"
              : err.code === err.TIMEOUT
                ? "Finding your location took too long. Please try again (outdoors or near a window helps)."
                : NO_LOCATION
          )
        ),
      // a reading from the last minute is fine: no new GPS fix for each race
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  });

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
  const [mode, setMode] = useState<Mode>("rules");
  const [accepted, setAccepted] = useState(false); // the rules sheet's "I accept" tick
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

  // Hooked an electric eel: the race-over card waits ZAP_MS, so Catbo's shock (race.ts) is seen
  // first. Keyed by the race's end, so each race's eel gets its moment
  const zapKey = state?.phase === "over" && state.cause === CAUSES.eel ? `${state.metres}-${state.fish}` : null;
  const [zapShown, setZapShown] = useState<string | null>(null);
  const zapping = zapKey !== null && zapShown !== zapKey;
  useEffect(() => {
    if (!zapKey) return;
    const timer = setTimeout(() => setZapShown(zapKey), ZAP_MS);
    return () => clearTimeout(timer);
  }, [zapKey]);

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
  // Playing for a discount: only at the restaurant (PLAY_AREA in src/lib/game-claims.ts). The
  // phone's location is asked for here, and the server checks it again when the claim opens and
  // before every race. A claim already open shows its code anywhere (to show at the till)
  const [locating, setLocating] = useState(false);
  // Where the player is, for the discount game: asked for on the first screen ("Turn on
  // location"). inside = at the restaurant: the discount button opens. Free play never needs it
  type Where = { state: "idle" } | { state: "checking" } | { state: "inside" } | { state: "outside"; message: string };
  const [where, setWhere] = useState<Where>(LOCATION_REQUIRED ? { state: "idle" } : { state: "inside" });
  const checkWhere = async () => {
    setLocating(true);
    setWhere({ state: "checking" });
    try {
      const away = checkSpot(await locate());
      setWhere(away ? { state: "outside", message: away } : { state: "inside" });
    } catch (e) {
      setWhere({ state: "outside", message: e instanceof Error ? e.message : NO_LOCATION });
    } finally {
      setLocating(false);
    }
  };
  // Location already allowed for this site (an earlier visit): checked straight away, no tap needed
  useEffect(() => {
    if (!LOCATION_REQUIRED || mode !== "choose" || where.state !== "idle" || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (p.state === "granted") checkWhere();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the first screen shows
  }, [mode]);
  const chooseClaim = () => {
    setError(null);
    if (where.state !== "inside") return; // the button is locked until the location is checked
    if (claim) return setMode("claim");
    formOpenedAt.current = Date.now();
    setMode("register");
  };
  // Step 1: name and number are checked, then WhatsApp opens with "GET OTP" typed, to send to us.
  // Our reply in that chat is the code (src/lib/game-otp.ts). Opened during the click, so the
  // browser doesn't block it as a popup
  // Computers: a new tab (wa.me); a browser that blocks it goes to WhatsApp in this tab instead.
  // Android: an intent link in this tab (whatsappAndroid), so the app opens and the game stays.
  // iPhone/iPad: only the app link (whatsapp://), in this tab, which stays on the game. No wa.me
  // fallback: while iOS shows its own "Open in WhatsApp / WA Business?" box the page still counts
  // as visible, so a timed fallback fired behind it and left the player on an api.whatsapp.com
  // page asking a second time. If WhatsApp didn't open, "Open WhatsApp again" is on the code screen
  const openWhatsApp = () => {
    const url = whatsapp(OTP_REQUEST_TEXT);
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) {
      window.location.href = whatsappApp(OTP_REQUEST_TEXT);
      return;
    }
    // Android: the app straight away, the game stays open in this tab (no WhatsApp web page)
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = whatsappAndroid(OTP_REQUEST_TEXT);
      return;
    }
    // Computers: WhatsApp Web / Desktop in a new tab
    const tab = window.open(url, "_blank");
    if (tab) tab.opener = null;
    else window.location.href = url;
  };
  // Before WhatsApp: can this number still play today (all its races used, or this phone already
  // played with another number)? Checked while the number is typed, so the tap usually knows
  // the answer at once and WhatsApp opens during the click itself
  const numberCheck = useRef<{ number: string; error: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const askNumber = async (number: string) => {
    const res = await inTime(checkNumberToday(number)).catch(() => ({ error: null }));
    numberCheck.current = { number, error: res.error };
    return res.error;
  };
  useEffect(() => {
    if (mode !== "register" || sentTo) return;
    const number = fullNumber(country, phone);
    const last = numberCheck.current;
    if (last && last.number !== number && last.error) setError((shown) => (shown === last.error ? null : shown)); // another number: its warning goes
    if (phone.replace(/\D/g, "").length < 7 || last?.number === number) return;
    const timer = setTimeout(() => {
      askNumber(number).then((problem) => {
        if (problem) setError(problem);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [mode, sentTo, country, phone]);
  const getCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const number = fullNumber(country, phone);
    const problem = checkPlayer({ name, phone: number, offers });
    if (problem) return setError(problem);
    setError(null);
    const known = numberCheck.current?.number === number ? numberCheck.current.error : undefined;
    let blocked = known;
    if (known === undefined) {
      setChecking(true);
      blocked = await askNumber(number);
      setChecking(false);
    }
    if (blocked) return setError(blocked);
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
      const spot = LOCATION_REQUIRED ? await locate() : undefined;
      const res = await inTime(verifyClaimCode({ name, phone: fullNumber(country, phone), offers }, otp, { hp: website, ms: Date.now() - formOpenedAt.current }, spot));
      if (!res.ok) return setError(res.error);
      storeClaim(res.claim.claimId);
      setClaim(res.claim);
      setSentTo(null);
      setMode("claim");
    } catch (e) {
      setError(e instanceof LocationError ? e.message : SLOW);
    } finally {
      setBusy(false);
    }
  };
  const startChance = async () => {
    if (!claim) return;
    setBusy(true);
    setError(null);
    try {
      const res = await inTime(startClaimChance(claim.claimId, LOCATION_REQUIRED ? await locate() : undefined));
      if (!res.ok) return setError(res.error);
      setClaim(res.claim);
      sentChance.current = null;
      setPendingChance(res.claim.chancesUsed);
      raceRef.current?.setAutoStart(false);
      raceRef.current?.start(res.seed); // the server's seed: the race it will replay
    } catch (e) {
      setError(e instanceof LocationError ? e.message : SLOW);
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
        {state && state.phase !== "racing" && !zapping && (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-navy/30 p-3 sm:p-4 overflow-y-auto ${mode === "free" ? "cursor-pointer" : ""}`}
            onClick={() => mode === "free" && raceRef.current?.jump()}
          >
            {mode === "rules" && (
              // Fits the game box at any size: the heading, the tick and the button always show,
              // only the guide in between scrolls (with a thin scrollbar)
              <div className={`${card} text-left max-h-full flex flex-col pb-6 sm:pb-7 md:pb-8`} role="document" aria-labelledby="rules-title">
                {closeX}
                <p className="shrink-0 text-[10px] tracking-[3px] sm:tracking-[4px] uppercase text-ocean font-bold mb-1.5 sm:mb-2 text-center">Catbo Racing</p>
                <p id="rules-title" className="shrink-0 font-playfair text-[19px] sm:text-[24px] leading-tight font-bold text-navy mb-2.5 sm:mb-3 text-center">
                  Game guide &amp; rules
                </p>
                <div
                  className="flex-1 min-h-[7.5rem] overflow-y-auto overscroll-contain pr-2 -mr-2 text-navy/80 text-[12px] sm:text-[13.5px] leading-snug space-y-3 [scrollbar-width:thin] [scrollbar-color:rgba(0,48,73,0.25)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-navy/25"
                  data-lenis-prevent
                >
                  <section>
                    <p className="font-bold text-navy text-[11px] uppercase tracking-[2px] mb-1.5">How to play</p>
                    <ul className="space-y-2">
                      <GuideRow pics={<img src="/race/catbo-surf.webp" alt="" className="h-10 w-auto" draggable={false} />} tag="Jump" tagClass="bg-navy text-cream">
                        This is Catbo. <span className="hidden md:inline">Click or press Space</span>
                        <span className="md:hidden">Tap the screen</span> to jump.
                      </GuideRow>
                      <GuideRow
                        pics={
                          <>
                            <Buoy className="h-9 w-auto" />
                            <Gull className="h-6 w-auto" />
                          </>
                        }
                        tag="Jump over"
                        tagClass="bg-green-600 text-white"
                      >
                        Buoys and gulls diving at you from ahead: jump over them.
                      </GuideRow>
                      <GuideRow
                        pics={
                          <>
                            <Dolphin className="h-7 w-auto" />
                            <Gull className="h-6 w-auto" flip />
                          </>
                        }
                        tag="Stay down"
                        tagClass="bg-amber-500 text-white"
                      >
                        Leaping dolphins, and gulls coming from behind, pass over you: don&rsquo;t jump into them.
                      </GuideRow>
                      <GuideRow
                        pics={
                          <>
                            <img src="/race/fish.webp" alt="" className="h-7 w-auto" draggable={false} />
                            <img src="/catbo/fish-hook.webp" alt="" className="h-9 w-9 md:hidden" draggable={false} />
                            <kbd className="hidden md:inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-navy/25 bg-white px-2 text-[15px] font-bold text-navy shadow-sm">↓</kbd>
                          </>
                        }
                        tag="Catch"
                        tagClass="bg-ocean text-white"
                      >
                        Catch fish: <span className="hidden md:inline">press ↓</span>
                        <span className="md:hidden">tap the hook button</span> to drop the line.
                      </GuideRow>
                      <GuideRow
                        pics={
                          <>
                            <Octopus className="h-8 w-auto" />
                            <Jelly className="h-8 w-auto" />
                            <ElectricEel className="h-6 w-auto" />
                          </>
                        }
                        tag="Never hook"
                        tagClass="bg-red-600 text-white"
                      >
                        Octopus, jellyfish and electric eels swim among the fish: hook one and the race is over (an eel gives Catbo a shock!).
                      </GuideRow>
                    </ul>
                    <p className="mt-2 text-[12px] text-navy/70">One hit and the race is over. The sea gets harder as you go.</p>
                  </section>
                  <section>
                    <p className="font-bold text-navy text-[11px] uppercase tracking-[2px] mb-1">Discount on your bill</p>
                    <p className="mb-1.5 rounded-lg bg-offer/10 border border-offer/30 px-3 py-2 text-[12.5px] font-bold text-navy">
                      Catch at least {MIN_FISH} fish in one race to get a discount. Fewer than {MIN_FISH} fish: no discount.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-1.5">
                      {[...DISCOUNT_TIERS].reverse().map((t) => (
                        <div key={t.fish} className="rounded-xl bg-white border border-navy/10 px-3 py-2 text-center">
                          <p className="text-[11px] text-navy/60">{t.fish === MIN_FISH ? `${t.fish} fish (minimum)` : `${t.fish}+ fish`}</p>
                          <p className="font-playfair text-[20px] font-bold text-navy leading-tight">{t.percent}% off</p>
                        </div>
                      ))}
                    </div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        From {MIN_FISH} fish, every extra fish counts: {MIN_FISH + 5} fish = {formatPercent(discountFor(MIN_FISH + 5))}% off, {MIN_FISH + 15} fish = {formatPercent(discountFor(MIN_FISH + 15))}% off, {DISCOUNT_TIERS[0].fish} fish or more = {DISCOUNT_TIERS[0].percent}% off (the most).
                      </li>
                      <li>
                        {CLAIM_CHANCES} races a day per phone number. You choose one race&rsquo;s score as your discount: races don&rsquo;t add up.
                      </li>
                      <li>Stay in the game until each race ends: a race you leave or pause doesn&rsquo;t count.</li>
                    </ul>
                  </section>
                  <section>
                    <p className="font-bold text-navy text-[11px] uppercase tracking-[2px] mb-1">Terms</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {LOCATION_REQUIRED && <li className="font-semibold text-navy">The discount game can only be played at Boat Seafood: your phone must be within {PLAY_AREA.radiusM} m of the restaurant, so the game asks for your location (only to check this; it isn&rsquo;t saved).</li>}
                      <li>Playing for a discount needs your name and a phone number checked by a WhatsApp code.</li>
                      <li>Show your claim code at the till. Staff apply it to one bill, once, within {CLAIM_VALID_HOURS} hours.</li>
                      <li>One game discount per bill (a group uses one person&rsquo;s code). It can&rsquo;t be combined with other offers and has no cash value.</li>
                      <li>Boat Seafood may cancel a claim if the game was played unfairly, and may change these rules.</li>
                      <li>Playing free needs no details and gives no discount.</li>
                    </ul>
                  </section>
                </div>
                <label className="shrink-0 mt-3 sm:mt-4 flex items-start gap-2.5 text-[12.5px] sm:text-[13px] text-navy cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-navy shrink-0"
                    autoFocus
                  />
                  <span>I have read the game guide and accept the rules.</span>
                </label>
                <button type="button" disabled={!accepted} className={`${button} shrink-0 w-full mt-3 disabled:opacity-40 disabled:pointer-events-none`} onClick={() => setMode("choose")}>
                  <ShieldCheck size={16} aria-hidden /> Accept &amp; continue
                </button>
              </div>
            )}

            {/* also after a free race, when "Play for a discount" brings the player here to check their location */}
            {mode === "choose" && (state.phase === "ready" || state.phase === "over") && (
              <div className={card} role="status">
                {closeX}
                <p className="text-[10px] tracking-[3px] sm:tracking-[4px] uppercase text-ocean font-bold mb-2">Catbo Racing</p>
                <p className="font-playfair text-[22px] sm:text-[28px] leading-tight font-bold text-navy mb-3">Surf with Catbo!</p>
                <p className="text-navy/75 text-[12.5px] leading-snug mb-4 sm:text-[14px] sm:leading-normal sm:mb-5">
                  <span className="hidden md:inline">Click or press Space</span>
                  <span className="md:hidden">Tap the screen</span> to jump over buoys and gulls diving at you. Dolphins, and gulls coming from behind, pass over you: don&rsquo;t jump into them! To fish, <span className="hidden md:inline">press ↓</span><span className="md:hidden">tap the hook button</span>. One hit and the race is over. It gets harder every 100 m, and more and more sea creatures swim among the fish: never hook an octopus, a jellyfish or an electric eel!
                </p>
                <div className="flex flex-col gap-2.5">
                  <button type="button" autoFocus className={button} onClick={playFree}>
                    <Play size={16} className="fill-current" aria-hidden /> Play free
                  </button>
                  {!LOCATION_REQUIRED && (
                    <button type="button" className={buttonAlt} onClick={chooseClaim}>
                      <Gift size={16} aria-hidden /> {claim ? "My discount claim" : "Play for a discount"}
                    </button>
                  )}
                  {/* The discount game: only at the restaurant. Locked until the location is checked */}
                  {LOCATION_REQUIRED && <div className="rounded-2xl border border-navy/15 bg-white/70 p-3 text-left">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[2px] text-navy/70 mb-1.5">
                      <MapPin size={13} aria-hidden /> Discount game · at Boat Seafood only
                    </p>
                    {where.state === "idle" && (
                      <>
                        <p className="text-[12px] leading-snug text-navy/70 mb-2.5">
                          Turn on your location to play for a discount. It works within {PLAY_AREA.radiusM} m of the restaurant.
                        </p>
                        <button type="button" className={`${button} w-full`} onClick={checkWhere}>
                          <LocateFixed size={16} aria-hidden /> Turn on location
                        </button>
                      </>
                    )}
                    {where.state === "checking" && (
                      <p className="flex items-center gap-2 text-[12.5px] text-navy py-2" role="status">
                        <Loader2 size={16} className="animate-spin" aria-hidden /> Checking your location…
                      </p>
                    )}
                    {where.state === "outside" && (
                      <>
                        <p role="alert" className="text-[12.5px] leading-snug text-offer font-semibold mb-2">{where.message}</p>
                        <button type="button" className={`${buttonAlt} w-full`} onClick={checkWhere} disabled={locating}>
                          <RotateCcw size={15} aria-hidden /> Check again
                        </button>
                      </>
                    )}
                    {where.state === "inside" && (
                      <>
                        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-green-700 mb-2.5">
                          <ShieldCheck size={15} aria-hidden /> You&rsquo;re at Boat Seafood: the discount game is open!
                        </p>
                        <button type="button" className={`${button} w-full`} onClick={chooseClaim}>
                          <Gift size={16} aria-hidden /> {claim ? "My discount claim" : "Play for a discount"}
                        </button>
                      </>
                    )}
                  </div>}
                  <p className="text-[11px] sm:text-[12px] leading-snug text-navy/60">
                    Off your bill: {RULES} · {chancesText()} · one discount per bill. Play free from anywhere!
                  </p>
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
                  <button type="submit" disabled={busy || checking} className={`${button} disabled:opacity-60`}>
                    {checking ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <MessageCircle size={16} aria-hidden />} Get code on WhatsApp
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
                  <button type="button" className={buttonAlt} onClick={(e) => { e.stopPropagation(); if (where.state === "inside") chooseClaim(); else { setError(null); setMode("choose"); } }}>
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
  const valid = new Date(c.expiresAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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
              {nextTier(latest.fish) && (
                <p className="text-ocean text-[12.5px] font-bold">
                  {nextTier(latest.fish)!.fish - latest.fish} more fish for {nextTier(latest.fish)!.percent}% off
                </p>
              )}
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
              {best && best.percent <= 0 && (
                <p className="text-navy text-[13px] mt-3">
                  Fewer than {MIN_FISH} fish: no discount this time. Come back tomorrow!
                </p>
              )}
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

// One line of the game guide: the pictures, what to do (a coloured tag), and a short text
function GuideRow({ pics, tag, tagClass, children }: { pics: React.ReactNode; tag: string; tagClass: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white/70 border border-navy/10 p-2">
      <span className="flex w-[5.5rem] shrink-0 items-center justify-center gap-1">{pics}</span>
      <span className="min-w-0">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[1.5px] mb-0.5 ${tagClass}`}>{tag}</span>
        <span className="block">{children}</span>
      </span>
    </li>
  );
}
