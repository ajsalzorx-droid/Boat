"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, MessageCircle, ShieldCheck } from "lucide-react";
import { OTP_REQUEST_TEXT } from "@/lib/game-claims";
import { whatsapp, whatsappAndroid, whatsappApp, WHATSAPP_DISPLAY } from "@/lib/whatsapp";
import { devPhoneCode, verifyPhoneCode } from "@/lib/phone-actions";

// "Verify your WhatsApp number", in the delivery and booking forms: the customer sends GET OTP to
// our WhatsApp (the button opens it with that typed), we reply with a 6-digit code in that chat
// (the game's code system, src/lib/game-otp.ts), they type it here. Then the number is remembered on
// this device for 30 days (src/lib/phone-verify.ts) and onVerified sends the order or booking.

const CODE_DIGITS = 6;

// WhatsApp with GET OTP typed, the way that works on each device (as in the game)
function openWhatsApp() {
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    window.location.href = whatsappApp(OTP_REQUEST_TEXT);
    return;
  }
  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = whatsappAndroid(OTP_REQUEST_TEXT);
    return;
  }
  const url = whatsapp(OTP_REQUEST_TEXT);
  const tab = window.open(url, "_blank");
  if (tab) tab.opener = null;
  else window.location.href = url;
}

export default function PhoneVerify({ phone, onVerified, onBack }: { phone: string; onVerified: () => void | Promise<void>; onBack: () => void }) {
  const [opened, setOpened] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (opened) codeRef.current?.focus();
  }, [opened]);

  const open = () => {
    openWhatsApp();
    setOpened(true);
    devPhoneCode(phone).catch(() => {}); // on a developer's computer only: the code shows in the terminal
  };

  const check = async (typed = code) => {
    const digits = typed.replace(/\D/g, "");
    if (digits.length !== CODE_DIGITS) return setError(`Please enter the ${CODE_DIGITS}-digit code.`);
    setError(null);
    setChecking(true);
    let res: Awaited<ReturnType<typeof verifyPhoneCode>>;
    try {
      res = await verifyPhoneCode(phone, digits);
    } catch {
      res = { ok: false, error: "Could not check the code. Please try again." };
    }
    if (!res.ok) {
      setChecking(false);
      return setError(res.error);
    }
    setDone(true);
    await onVerified();
    setChecking(false);
  };

  const step = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-cream";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col">
      <button type="button" onClick={onBack} className="mb-5 inline-flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-[2.5px] text-navy/60 hover:text-navy">
        <ArrowLeft size={14} aria-hidden /> Back
      </button>
      <h2 className="font-playfair text-2xl sm:text-3xl font-bold leading-tight mb-2 flex items-center gap-3 text-navy">
        <ShieldCheck size={26} className="text-ocean shrink-0" aria-hidden /> Verify your number
      </h2>
      <p className="mb-6 text-[14px] text-navy/65 leading-relaxed">
        We send your updates on WhatsApp, so we check it is your number. You only do this once on this phone.
      </p>

      <ol className="flex flex-col gap-5">
        <li className="flex gap-3">
          <span className={step}>1</span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-navy">
              Send <b>{OTP_REQUEST_TEXT}</b> to us on WhatsApp{WHATSAPP_DISPLAY ? <> (<span className="whitespace-nowrap">{WHATSAPP_DISPLAY}</span>)</> : null} from <b className="whitespace-nowrap">{phone}</b>.
            </p>
            <button
              type="button"
              onClick={open}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-[11px] font-bold uppercase tracking-[2px] text-white transition-colors hover:bg-[#1ebe5b]"
            >
              <MessageCircle size={16} aria-hidden /> {opened ? "Open WhatsApp again" : "Open WhatsApp"}
            </button>
          </div>
        </li>
        <li className="flex gap-3">
          <span className={step}>2</span>
          <div className="flex-1 min-w-0">
            <label htmlFor="verify-code" className="block text-[14px] text-navy mb-2">
              Type the {CODE_DIGITS}-digit code we reply with:
            </label>
            <div className="flex gap-2">
              <input
                ref={codeRef}
                id="verify-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_DIGITS}
                value={code}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, CODE_DIGITS);
                  setCode(digits);
                  if (digits.length === CODE_DIGITS && !checking) check(digits); // a pasted code goes straight away
                }}
                placeholder="••••••"
                className="w-36 rounded-lg border border-navy/20 bg-white px-3.5 py-2.5 text-center font-jost text-[20px] tracking-[6px] text-navy placeholder:text-navy/25 focus:border-navy focus:ring-2 focus:ring-ocean/40 outline-none"
              />
              <button
                type="button"
                onClick={() => check()}
                disabled={checking || done}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-navy px-4 text-[11px] font-bold uppercase tracking-[2px] text-cream transition-colors hover:bg-ocean hover:text-navy disabled:opacity-60"
              >
                {done ? <><Check size={15} aria-hidden /> Verified</> : checking ? "Checking..." : "Verify"}
              </button>
            </div>
            {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-offer">{error}</p>}
            <p className="mt-3 text-[12px] text-navy/50">Didn&rsquo;t get a code? Send {OTP_REQUEST_TEXT} again: we reply with a new one.</p>
          </div>
        </li>
      </ol>
    </motion.div>
  );
}
