"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Check, ChevronDown, Link2, LocateFixed, Minus, Plus, Share2, ShoppingBag, Tag, Truck, X } from "lucide-react";
import type { MenuItem } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice, unitPrice } from "@/lib/offers";
import { placeDeliveryOrder } from "@/app/menu/actions";
import { COUNTRIES, fullNumber } from "@/lib/phone-countries";
import PhoneVerify from "./PhoneVerify";

// A dish's details over the page: photo, price (and offer), description, ingredients. The dish is the
// one the page loaded from the database (Admin -> Menu), so nothing is fetched to show it.
// "Add to order" then asks how: Table Booking (the booking form, with this dish pre-ordered) or
// Delivery (name, phone, location: saved as a delivery order, listed in the admin dashboard).
// At a restaurant table (tableNumber, from the table's QR code) it adds to the table's order instead.
// cartHref: on pages without the cart (the homepage), the "View order" link to the menu page.
// Esc, the close button or a click outside closes it.

const MAX_QTY = 20;

export default function DishDetail({
  item,
  onClose,
  cartHref,
  tableNumber = null,
}: {
  item: MenuItem | null;
  onClose: () => void;
  cartHref?: string;
  tableNumber?: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = item !== null;

  // showModal keeps the keyboard inside (and gives it back to the dish card when it closes);
  // the page behind does not scroll
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    dialog.showModal();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="dish-detail-title"
      data-lenis-prevent
      // Only when it really is closed: React's development mode opens, closes and reopens it at once
      // when it starts open (a shared ?dish= link), and that close event comes after the reopening
      onClose={(e) => {
        if (!e.currentTarget.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // the dark area around the card
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl bg-white p-0 text-navy shadow-2xl backdrop:bg-ink/75 backdrop:backdrop-blur-sm"
    >
      {/* key: another dish starts again at its details */}
      {item && <DishBody key={item.id} item={item} onClose={onClose} cartHref={cartHref} tableNumber={tableNumber} />}
    </dialog>
  );
}

type Step = "details" | "choose" | "delivery" | "sent";

const chip = "text-[9px] font-bold tracking-[2px] uppercase py-1.5 px-3 rounded-full";
const bigButton = "flex flex-1 items-center justify-center gap-2 rounded-lg py-4 px-6 font-jost text-[11px] font-bold uppercase tracking-[3px] transition-colors";
const inputClass =
  "w-full border border-navy/20 rounded-lg px-3.5 py-2.5 text-[16px] text-navy bg-white placeholder:text-navy/30 focus:border-navy focus:ring-2 focus:ring-ocean/40 outline-none";
const labelClass = "block text-[9px] tracking-[2px] uppercase font-bold text-navy/70 mb-1.5";

function DishBody({ item, onClose, cartHref, tableNumber }: { item: MenuItem; onClose: () => void; cartHref?: string; tableNumber: string | null }) {
  const { cart, addToCart, updateQuantity, setIsCartOpen } = useCart();
  const [step, setStep] = useState<Step>("details");
  const [qty, setQty] = useState(1);
  const inCart = cart.find((c) => c.item.id === item.id)?.quantity ?? 0;
  const price = unitPrice(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative grid md:grid-cols-2"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-navy shadow-md transition-colors hover:bg-navy hover:text-cream"
      >
        <X size={20} aria-hidden />
      </button>

      {/* Photo */}
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[480px] overflow-hidden bg-navy/5">
        {item.image && <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />}
        {item.discount ? <span className={`${chip} absolute left-4 top-4 bg-offer text-white shadow-lg text-[11px]`}>{item.discount}% Off</span> : null}
      </div>

      <div className="flex flex-col p-6 sm:p-8 md:p-10">
        {step === "details" && (
          <>
            <div className="mb-4 flex flex-wrap gap-2 pr-10">
              {item.category && <span className={`${chip} border border-navy/15 text-navy/60`}>{item.category}</span>}
              {item.tag && <span className={`${chip} bg-navy text-cream`}>{item.tag}</span>}
              {item.dietary?.map((d) => (
                <span key={d} className={`${chip} bg-ocean/90 text-navy`}>{d}</span>
              ))}
            </div>

            <h2 id="dish-detail-title" className="font-playfair text-3xl md:text-4xl font-bold leading-tight mb-3">
              {item.name}
            </h2>

            {item.discount ? (
              <p className="mb-2 flex items-baseline gap-3 font-jost">
                <span className="text-[15px] text-navy/45 line-through">AED {item.price}</span>
                <span className="text-2xl font-semibold text-offer">AED {formatPrice(price)}</span>
              </p>
            ) : (
              <p className="mb-2 font-jost text-2xl font-medium text-ocean">AED {item.price}</p>
            )}
            {item.offer_title && (
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[2.5px] text-offer">
                <Tag size={12} aria-hidden /> {item.offer_title}
              </p>
            )}

            <div className="my-5 h-[1px] w-12 bg-ocean/40"></div>

            {item.description && <p className="mb-6 text-[15px] font-light leading-relaxed text-navy/75">{item.description}</p>}

            {item.ingredients?.length ? (
              <div className="mb-8">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[3px] text-navy/60">Ingredients</h3>
                <ul className="flex flex-wrap gap-2">
                  {item.ingredients.map((ing) => (
                    <li key={ing} className="rounded-full bg-cream px-3.5 py-1.5 text-[13px] text-navy/80">
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
              {/* At a restaurant table: the table's own order (the cart), as before */}
              {tableNumber && inCart > 0 ? (
                <>
                  <Stepper value={inCart} name={item.name} onLess={() => updateQuantity(item.id, -1)} onMore={() => addToCart(item)} />
                  {cartHref ? (
                    <Link href={cartHref} onClick={() => setIsCartOpen(true)} className={`${bigButton} bg-ocean text-navy hover:bg-navy hover:text-cream`}>
                      <ShoppingBag size={16} aria-hidden /> View order
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setIsCartOpen(true);
                      }}
                      className={`${bigButton} bg-ocean text-navy hover:bg-navy hover:text-cream`}
                    >
                      <ShoppingBag size={16} aria-hidden /> View order
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => (tableNumber ? addToCart(item) : setStep("choose"))}
                  className={`${bigButton} bg-navy text-cream hover:bg-ocean hover:text-navy`}
                >
                  <Plus size={16} aria-hidden /> Add to order
                </button>
              )}
              <ShareDish item={item} />
            </div>
          </>
        )}

        {step === "choose" && (
          <>
            <BackButton onClick={() => setStep("details")} />
            <h2 id="dish-detail-title" className="font-playfair text-3xl font-bold leading-tight mb-2 pr-10">
              How would you like it?
            </h2>
            <p className="mb-6 text-[14px] text-navy/60">{item.name}</p>

            <div className="mb-6 flex items-center justify-between gap-4 rounded-xl bg-cream/60 px-4 py-3">
              <Stepper value={qty} name={item.name} onLess={() => setQty((q) => Math.max(1, q - 1))} onMore={() => setQty((q) => Math.min(MAX_QTY, q + 1))} />
              <span className="font-jost text-lg font-semibold">AED {formatPrice(price * qty)}</span>
            </div>

            <div className="grid gap-3">
              <Link
                href={`/book?dish=${encodeURIComponent(item.id)}&qty=${qty}`}
                className="group flex items-center gap-4 rounded-xl border border-navy/15 p-5 text-left no-underline transition-colors hover:border-navy hover:bg-navy hover:text-cream"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ocean/20 text-navy group-hover:bg-ocean">
                  <CalendarDays size={22} aria-hidden />
                </span>
                <span>
                  <span className="block text-[12px] font-bold uppercase tracking-[2.5px]">Table Booking</span>
                  <span className="block text-[13px] opacity-70">Book a table; your dish is ready when you come.</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setStep("delivery")}
                className="group flex items-center gap-4 rounded-xl border border-navy/15 p-5 text-left transition-colors hover:border-navy hover:bg-navy hover:text-cream"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ocean/20 text-navy group-hover:bg-ocean">
                  <Truck size={22} aria-hidden />
                </span>
                <span>
                  <span className="block text-[12px] font-bold uppercase tracking-[2.5px]">Delivery</span>
                  <span className="block text-[13px] opacity-70">We bring it to your door.</span>
                </span>
              </button>
            </div>
          </>
        )}

        {(step === "delivery" || step === "sent") && (
          <DeliveryForm item={item} qty={qty} setQty={setQty} sent={step === "sent"} onSent={() => setStep("sent")} onBack={() => setStep("choose")} onClose={onClose} />
        )}
      </div>
    </motion.div>
  );
}

// Share the dish: WhatsApp, Instagram, or copy the link. The link (/menu?dish=<id>) opens the menu
// with this dish's details, and its preview shows the dish's photo and name (menu/page.tsx).
// Instagram has no "share a link" address on the web: on a phone the phone's own share sheet opens
// (Instagram is in it when installed); elsewhere the link is copied and Instagram opens to paste it.
function ShareDish({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<"copied" | "instagram" | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // A click anywhere else closes the list
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const link = () => `${window.location.origin}/menu?dish=${encodeURIComponent(item.id)}`;
  const message = () => `${item.name} at Boat Seafood, Dubai · AED ${formatPrice(unitPrice(item))}\n${link()}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      return true;
    } catch {
      return false; // blocked by the browser
    }
  };
  const flash = (what: "copied" | "instagram") => {
    setDone(what);
    setTimeout(() => setDone(null), 2500);
  };

  const whatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message())}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };
  const instagram = async () => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.share) {
      setOpen(false);
      await navigator.share({ title: item.name, text: `${item.name} at Boat Seafood, Dubai`, url: link() }).catch(() => {});
      return;
    }
    await copy();
    flash("instagram");
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };
  const copyLink = async () => {
    if (await copy()) flash("copied");
  };

  const option = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-semibold text-navy hover:bg-cream transition-colors";

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-2 rounded-lg border px-5 py-4 font-jost text-[11px] font-bold uppercase tracking-[3px] transition-colors ${
          open ? "border-navy bg-navy text-cream" : "border-navy/20 text-navy hover:border-navy"
        }`}
      >
        <Share2 size={16} aria-hidden /> Share
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute bottom-full right-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-navy/10 bg-white py-1.5 shadow-xl"
          >
            <button type="button" onClick={whatsapp} className={option}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white"><WhatsAppIcon /></span>
              WhatsApp
            </button>
            <button type="button" onClick={instagram} className={option}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white"><InstagramIcon /></span>
              {done === "instagram" ? "Link copied: paste it" : "Instagram"}
            </button>
            <button type="button" onClick={copyLink} className={option}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-navy">{done === "copied" ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}</span>
              <span aria-live="polite">{done === "copied" ? "Link copied!" : "Copy link"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-5 inline-flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-[2.5px] text-navy/60 hover:text-navy">
      <ArrowLeft size={14} aria-hidden /> Back
    </button>
  );
}

function Stepper({ value, name, onLess, onMore }: { value: number; name: string; onLess: () => void; onMore: () => void }) {
  return (
    <div className="flex items-center rounded-full border border-navy/20 bg-white px-2 py-1.5">
      <button type="button" onClick={onLess} aria-label={`One less ${name}`} className="p-2 text-navy/60 hover:text-navy">
        <Minus size={16} aria-hidden />
      </button>
      <span aria-live="polite" className="w-8 text-center text-sm font-bold">{value}</span>
      <button type="button" onClick={onMore} aria-label={`One more ${name}`} className="p-2 text-navy/60 hover:text-navy">
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );
}

// The name and number are remembered on this device (the menu's order form uses the same).
// A number saved with its country code ("+91 9562919404") comes back split: code chosen, number typed
function savedCustomer() {
  const empty = { name: "", phone: "", country: COUNTRIES[0][0] as string };
  try {
    const saved = JSON.parse(localStorage.getItem("order-customer") || "null");
    if (!saved || typeof saved.name !== "string" || typeof saved.phone !== "string") return empty;
    const coded = /^\+(\d{1,3}) (.+)$/.exec(saved.phone.trim());
    const known = coded && COUNTRIES.find(([code]) => code === coded[1]);
    return known ? { name: saved.name, phone: coded![2], country: known[0] as string } : { ...empty, name: saved.name, phone: saved.phone };
  } catch {}
  return empty;
}

function DeliveryForm({
  item,
  qty,
  setQty,
  sent,
  onSent,
  onBack,
  onClose,
}: {
  item: MenuItem;
  qty: number;
  setQty: (update: (q: number) => number) => void;
  sent: boolean;
  onSent: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => ({ ...savedCustomer(), location: "" }));
  // The number with its country code (UAE first), so the WhatsApp messages reach it: an Indian
  // 9562... would otherwise be read as a +956 number (src/lib/phone-countries.ts)
  const phone = form.phone.trim() ? fullNumber(form.country, form.phone) : "";
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [website, setWebsite] = useState(""); // spam check: a hidden field people never fill
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError("This browser can't share its location. Please type the address.");
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Could not get your location. Please type the address.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // A number not yet proved on this device: the "verify your number" step, then the order goes
  const [verifying, setVerifying] = useState(false);

  const send = async () => {
    setError(null);
    setSending(true);
    let res: Awaited<ReturnType<typeof placeDeliveryOrder>>;
    try {
      res = await placeDeliveryOrder([{ id: item.id, quantity: qty }], { hp: website, ms: Date.now() - openedAt.current }, { name: form.name, phone, location: form.location, map: pin });
    } catch {
      res = { ok: false, error: "Could not send your order. Please try again." };
    }
    setSending(false);
    if (!res.ok) {
      if (res.verify) return setVerifying(true);
      setVerifying(false);
      return setError(res.error);
    }
    try {
      localStorage.setItem("order-customer", JSON.stringify({ name: form.name.trim(), phone }));
    } catch {}
    setVerifying(false);
    onSent();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError("Please enter your name.");
    if (form.phone.replace(/\D/g, "").length < 7) return setError("Please enter your phone number.");
    if (form.location.trim().length < 5) return setError("Please enter the delivery location (area, building, flat).");
    await send();
  };

  if (verifying && !sent) {
    return <PhoneVerify phone={phone} onVerified={send} onBack={() => setVerifying(false)} />;
  }

  if (sent) {
    return (
      <div className="my-auto py-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-600">
          <Check size={32} aria-hidden />
        </motion.div>
        <h2 id="dish-detail-title" className="font-playfair text-3xl font-bold mb-3">Order received!</h2>
        <p role="status" className="mb-8 text-[15px] text-navy/70 leading-relaxed">
          {qty} × {item.name} for delivery. We will confirm it on WhatsApp (<span className="font-semibold text-navy whitespace-nowrap">{phone}</span>) with the cooking time.
        </p>
        <button type="button" onClick={onClose} className={`${bigButton} w-full bg-navy text-cream hover:bg-ocean hover:text-navy`}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col">
      <BackButton onClick={onBack} />
      <h2 id="dish-detail-title" className="font-playfair text-3xl font-bold leading-tight mb-5 pr-10 flex items-center gap-3">
        <Truck size={26} className="text-ocean" aria-hidden /> Delivery
      </h2>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-cream/60 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{item.name}</p>
          <p className="font-jost text-[15px] font-semibold text-ocean">AED {formatPrice(unitPrice(item) * qty)}</p>
        </div>
        <Stepper value={qty} name={item.name} onLess={() => setQty((q) => Math.max(1, q - 1))} onMore={() => setQty((q) => Math.min(MAX_QTY, q + 1))} />
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="d-name" className={labelClass}>Your Name *</label>
          <input id="d-name" type="text" autoComplete="name" maxLength={60} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter your name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="d-phone" className={labelClass}>Phone Number (WhatsApp) *</label>
          <div className="flex items-stretch gap-2">
            {/* Country code: shows the flag and code; the list it opens has the names too */}
            <div className="relative shrink-0 w-[6.25rem]">
              <span aria-hidden className="pointer-events-none flex h-full items-center justify-between gap-1 rounded-lg border border-navy/20 bg-white pl-2.5 pr-1.5 text-[15px] text-navy">
                <span className="whitespace-nowrap">{COUNTRIES.find(([code]) => code === form.country)?.[1]} +{form.country}</span>
                <ChevronDown size={14} className="shrink-0 text-navy/50" />
              </span>
              <label htmlFor="d-country" className="sr-only">Country code</label>
              <select id="d-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                {COUNTRIES.map(([code, flag, label]) => (
                  <option key={code} value={code}>{flag} {label} (+{code})</option>
                ))}
              </select>
            </div>
            <input id="d-phone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={20} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 50 123 4567" className={`${inputClass} flex-1 min-w-0`} />
          </div>
        </div>
        <div>
          <label htmlFor="d-location" className={labelClass}>Delivery Location *</label>
          <textarea
            id="d-location"
            rows={2}
            autoComplete="street-address"
            maxLength={200}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Area, building, flat number"
            className={`${inputClass} resize-none`}
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] transition-colors disabled:opacity-60 ${
              pin ? "border-green-600/40 bg-green-50 text-green-700" : "border-navy/20 text-navy/70 hover:border-navy hover:text-navy"
            }`}
          >
            {pin ? <Check size={13} aria-hidden /> : <LocateFixed size={13} aria-hidden />}
            {locating ? "Finding you..." : pin ? "Map pin added" : "Use my location"}
          </button>
        </div>
        {/* Spam check: people never see or fill this */}
        <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        {error && <p role="alert" className="text-[13px] font-semibold text-offer">{error}</p>}
      </div>

      <button type="submit" disabled={sending} className={`${bigButton} mt-6 bg-navy text-cream hover:bg-ocean hover:text-navy disabled:opacity-60`}>
        {sending ? "Sending..." : `Place delivery order · AED ${formatPrice(unitPrice(item) * qty)}`}
      </button>
      <p className="mt-3 text-center text-[12px] text-navy/50">We will confirm your order on WhatsApp, with the cooking time.</p>
    </form>
  );
}
