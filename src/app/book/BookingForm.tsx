"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronDown, Fish, Check, Phone, Home } from "lucide-react";
import { COUNTRIES, fullNumber } from "@/lib/phone-countries";
import Navbar from "@/components/Navbar";
import { useSection } from "@/context/ContentContext";
import { whatsapp } from "@/lib/whatsapp";
import {
  addDays,
  ANY_TABLE,
  BOOK_DAYS_AHEAD,
  checkBooking,
  CHEF_CHOICE,
  dubaiNow,
  FISH_PREP_ENABLED,
  formatDate,
  formatTime,
  MAX_GUESTS,
  slotLabel,
  visitDate,
  tableLabel,
  TABLE_AREAS,
  TABLES,
  fitsGroup,
  tablesFor,
  timeSlots,
  type BookingInput,
  type BookingType,
} from "@/lib/bookings";
import { createBooking, takenTables } from "./actions";
import PreorderPicker, { type PreorderDish } from "./PreorderPicker";
import PhoneVerify from "@/components/PhoneVerify";
import Toaster, { toast } from "@/app/admin/Toaster";

const ALL_TABS: { value: BookingType; label: string; icon: typeof Fish; intro: string }[] = [
  { value: "table", label: "Table Booking", icon: CalendarDays, intro: "Book your table at Waterfront Market. We will confirm your booking on WhatsApp." },
  {
    value: "fish",
    label: "Fish Preparation",
    icon: Fish,
    intro: "Bringing fish from the market? Tell us what you have and how you like it, and our chefs will be ready for you.",
  },
];
// Fish preparation shows only while FISH_PREP_ENABLED (src/lib/bookings.ts)
const TABS = ALL_TABS.filter((t) => t.value === "table" || FISH_PREP_ENABLED);

const EMPTY: Omit<BookingInput, "type"> = {
  name: "",
  phone: "",
  email: "",
  date: "",
  time: "",
  guests: 2,
  table: "",
  fish_type: "",
  fish_weight: "",
  style: "",
  notes: "",
  items: [],
};

const inputClass =
  "w-full border border-navy/20 rounded-lg px-3.5 py-2.5 text-[14px] text-navy bg-white placeholder:text-navy/30 focus:border-navy focus:ring-2 focus:ring-ocean/40 outline-none transition";
const labelClass = "block text-[9px] sm:text-[10px] tracking-[2px] uppercase font-bold text-navy/70 mb-1.5";

export default function BookingForm({
  initialType,
  hours,
  phone,
  dishes,
  initialItems = [],
}: {
  initialType: BookingType;
  initialItems?: BookingInput["items"];
  hours: { opens: string; closes: string };
  phone: string;
  dishes: PreorderDish[];
}) {
  const styles = useSection("fish_styles").items.map((s) => s.title).filter(Boolean);
  const [type, setType] = useState<BookingType>(FISH_PREP_ENABLED ? initialType : "table");
  const [country, setCountry] = useState<string>(COUNTRIES[0][0]); // the phone number's country code (UAE first)
  const [form, setForm] = useState({ ...EMPTY, items: initialItems });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  // Dates and times depend on the visitor's current time: worked out after the page loads
  const [now, setNow] = useState<number | null>(null);
  // Spam checks (src/lib/rate-limit.ts): a hidden field real visitors never see or fill, and when
  // the form opened (the server refuses forms sent instantly)
  const [website, setWebsite] = useState("");
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);

  const today = now === null ? "" : dubaiNow(now).date;
  const slots = now === null || !form.date ? [] : timeSlots(hours.opens, hours.closes, form.date, now);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  // Tables already booked near the chosen date and time (asked of the server when they change).
  // A chosen table that is taken, or too small for the group, stops counting as chosen
  const [taken, setTaken] = useState<{ key: string; ids: string[] } | null>(null);
  const takenKey = form.date && form.time ? `${form.date} ${form.time}` : "";
  useEffect(() => {
    if (!takenKey) return;
    let stale = false;
    const [date, time] = takenKey.split(" ");
    takenTables(date, time)
      .then((ids) => !stale && setTaken({ key: takenKey, ids }))
      .catch(() => !stale && setTaken({ key: takenKey, ids: [] }));
    return () => {
      stale = true;
    };
  }, [takenKey]);
  const tablesKnown = !!takenKey && taken?.key === takenKey;
  const freeTables = tablesKnown ? tablesFor(form.guests, taken!.ids) : [];
  const tableOk = freeTables.some((t) => t.id === form.table);
  const chosenTable = tableOk ? form.table : "";

  // A number not yet proved on this device: the "verify your number" step, then the booking goes
  const [verifying, setVerifying] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const booking: BookingInput = { ...form, phone: form.phone.trim() ? fullNumber(country, form.phone) : "", table: chosenTable, type };
    // Same checks as the server, so mistakes show right away
    const problem = checkBooking(booking, hours);
    if (problem) {
      setVerifying(false);
      setError(problem);
      return;
    }
    setError(null);
    setStatus("sending");
    let res;
    try {
      res = await createBooking(booking, { hp: website, ms: Date.now() - openedAt.current });
    } catch {
      res = { ok: false as const, error: "Could not send your booking. Please try again or call us." };
    }
    if (!res.ok) {
      setStatus("idle");
      if ("verify" in res && res.verify) {
        setVerifying(true);
        return;
      }
      setVerifying(false);
      setError(res.error);
      return;
    }
    setVerifying(false);
    setStatus("done");
  };

  const reset = () => {
    setForm({ ...EMPTY, name: form.name, phone: form.phone, email: form.email });
    setStatus("idle");
  };

  const tab = TABS.find((t) => t.value === type)!;

  return (
    <>
      <Navbar />
      <Toaster />
      {/* Only the form: the card fills the screen under the fixed navbar (92px phone, 137px from md)
          and its fields scroll inside it, with the tabs staying on top */}
      <main className="h-dvh flex items-center justify-center px-3 sm:px-6 pt-[104px] pb-3 md:pt-[153px] md:pb-6 bg-gradient-to-br from-ink via-navy to-ocean/60">
          <h1 className="sr-only">Table booking at Boat Seafood</h1>
          <div className="w-full max-w-xl h-full max-h-[880px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Which booking */}
            {TABS.length > 1 && <div role="tablist" aria-label="Booking type" className="shrink-0 grid grid-cols-2 border-b border-navy/10">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={type === t.value}
                  onClick={() => {
                    setType(t.value);
                    setError(null);
                    if (status === "done") reset();
                  }}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-3.5 px-2 text-[9px] sm:text-[10px] font-bold tracking-[1px] min-[400px]:tracking-[2px] uppercase whitespace-nowrap transition-colors border-b-2 ${
                    type === t.value ? "text-navy border-navy bg-white" : "text-navy/50 border-transparent bg-cream/40 hover:text-navy"
                  }`}
                >
                  <t.icon size={16} className="shrink-0" />
                  {t.label}
                </button>
              ))}
            </div>}
            {TABS.length === 1 && (
              <div className="shrink-0 flex items-center justify-center gap-2 py-3.5 border-b border-navy/10 text-[10px] font-bold tracking-[2px] uppercase text-navy">
                <CalendarDays size={16} className="shrink-0" /> {TABS[0].label}
              </div>
            )}

            <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto overscroll-contain admin-scroll p-5 sm:p-7">
              <AnimatePresence mode="wait">
                {status === "done" ? (
                  <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-6">
                    <div className="w-16 h-16 bg-green-500/15 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check size={32} />
                    </div>
                    <h2 className="font-playfair text-2xl font-bold text-navy mb-3">Request Received!</h2>
                    <p className="text-navy/70 leading-relaxed mb-6">
                      Thank you, {form.name.trim()}. We have your request for{" "}
                      {type === "fish" ? "fish preparation" : form.table && form.table !== ANY_TABLE ? <b>{tableLabel(form.table)}</b> : "a table"} on <b>{formatDate(visitDate(form.date, form.time))}</b> at <b>{formatTime(form.time)}</b>.
                      {" "}Once we confirm it, you will get a WhatsApp message on <b className="whitespace-nowrap">{fullNumber(country, form.phone)}</b>.
                      {form.items.length > 0 && " Your pre-ordered dishes will be ready for you."}
                    </p>
                    <div className="flex flex-col gap-3 max-w-sm mx-auto">
                      <Link href="/" className="flex items-center justify-center gap-2 bg-navy text-cream rounded-lg py-4 px-7 text-[10px] font-bold tracking-[2.5px] uppercase no-underline hover:bg-ocean hover:text-navy transition-colors">
                        <Home size={15} /> Back to Home
                      </Link>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={reset} className="border border-navy/20 rounded-lg py-3.5 px-3 text-[9px] sm:text-[10px] font-bold tracking-[2px] uppercase text-navy hover:border-navy transition-colors">
                          Book Again
                        </button>
                        <Link href="/menu" className="text-center border border-navy/20 rounded-lg py-3.5 px-3 text-[9px] sm:text-[10px] font-bold tracking-[2px] uppercase text-navy no-underline hover:border-navy transition-colors">
                          View Menu
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ) : verifying ? (
                  <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <PhoneVerify phone={fullNumber(country, form.phone)} onVerified={() => submit()} onBack={() => setVerifying(false)} />
                  </motion.div>
                ) : (
                  <motion.form key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={submit} noValidate className="flex flex-col gap-4">
                    {/* Hidden from people (and screen readers); bots that fill every field get caught */}
                    <div aria-hidden className="absolute -left-[9999px] w-px h-px overflow-hidden">
                      <label htmlFor="b-website">Website</label>
                      <input id="b-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </div>
                    <p className="text-[13px] text-navy/70 leading-relaxed">{tab.intro}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="b-name" className={labelClass}>Your Name *</label>
                        <input id="b-name" type="text" autoComplete="name" maxLength={60} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Enter your name" className={inputClass} />
                      </div>
                      <div>
                        <label htmlFor="b-phone" className={labelClass}>Phone Number (WhatsApp) *</label>
                        {/* The country code goes in front, so the WhatsApp confirmation reaches the
                            right number (an Indian 95629... would otherwise be read as +956...) */}
                        <div className="flex items-stretch gap-2">
                          <div className="relative shrink-0 w-[6.25rem]">
                            <span aria-hidden className="pointer-events-none flex h-full items-center justify-between gap-1 rounded-lg border border-navy/20 bg-white pl-2.5 pr-1.5 text-[14px] text-navy">
                              <span className="whitespace-nowrap">{COUNTRIES.find(([code]) => code === country)?.[1]} +{country}</span>
                              <ChevronDown size={14} className="shrink-0 text-navy/50" />
                            </span>
                            <label htmlFor="b-country" className="sr-only">Country code</label>
                            <select id="b-country" value={country} onChange={(e) => setCountry(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                              {COUNTRIES.map(([code, flag, label]) => (
                                <option key={code} value={code}>{flag} {label} (+{code})</option>
                              ))}
                            </select>
                          </div>
                          <input id="b-phone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={20} value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Enter your number" className={`${inputClass} flex-1 min-w-0`} />
                        </div>
                        <p className="mt-1 text-[11px] text-navy/50">We send your booking confirmation here on WhatsApp.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label htmlFor="b-date" className={labelClass}>Date *</label>
                        <input
                          id="b-date"
                          type="date"
                          min={today || undefined}
                          max={today ? addDays(today, BOOK_DAYS_AHEAD) : undefined}
                          value={form.date}
                          onChange={(e) => set({ date: e.target.value, time: "" })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="b-time" className={labelClass}>Time *</label>
                        <select id="b-time" value={form.time} onChange={(e) => set({ time: e.target.value })} disabled={!form.date} className={`${inputClass} disabled:bg-gray-50 disabled:text-navy/40`}>
                          <option value="">{!form.date ? "Pick a date first" : slots.length ? "Choose" : "No times left"}</option>
                          {slots.map((s) => (
                            <option key={s} value={s}>{slotLabel(s)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="b-guests" className={labelClass}>Guests *</label>
                        <select id="b-guests" value={form.guests} onChange={(e) => set({ guests: Number(e.target.value) })} className={inputClass}>
                          {Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {type === "table" && (
                      <div>
                        <span className={labelClass}>Choose Your Table *</span>
                        {!takenKey ? (
                          <p className="text-[12px] text-navy/50">Pick a date and time first to see the free tables.</p>
                        ) : !tablesKnown ? (
                          <p className="text-[12px] text-navy/50">Checking free tables…</p>
                        ) : (
                          <>
                            <div role="radiogroup" aria-label="Table" className="flex flex-col gap-3">
                              {/* Every table shows, by area. One already booked at this time (or too small
                                  for the group, where seats are set) is greyed out; tapping it says why */}
                              {TABLE_AREAS.map(({ area, label }) => (
                                <div key={area}>
                                  <p className="text-[11px] font-bold uppercase tracking-[2px] text-navy/60 mb-1.5">{label}</p>
                                  <div className="grid grid-cols-6 min-[420px]:grid-cols-8 sm:grid-cols-10 gap-1.5">
                                    {TABLES.filter((t) => t.area === area).map((t) => {
                                      const booked = taken!.ids.includes(t.id);
                                      const small = !fitsGroup(t, form.guests);
                                      const off = booked || small;
                                      const picked = chosenTable === t.id;
                                      return (
                                        <button
                                          key={t.id}
                                          type="button"
                                          role="radio"
                                          aria-checked={picked}
                                          aria-disabled={off}
                                          aria-label={`${tableLabel(t.id)}${booked ? ", booked" : small ? ", too small" : ""}`}
                                          title={tableLabel(t.id)}
                                          onClick={() => {
                                            if (booked) return toast(`${tableLabel(t.id)} is already booked at ${formatTime(form.time)}. Please choose another table or time.`, "error");
                                            if (small) return toast(`${tableLabel(t.id)} seats up to ${t.seats}. For ${form.guests} guests, please choose a bigger table.`, "error");
                                            set({ table: t.id });
                                          }}
                                          className={`h-10 rounded-lg border text-[13px] font-semibold transition-colors ${
                                            picked
                                              ? "bg-navy text-white border-navy"
                                              : off
                                                ? "bg-gray-50 text-navy/30 border-navy/10 cursor-not-allowed line-through"
                                                : "bg-white text-navy border-navy/20 hover:border-navy"
                                          }`}
                                        >
                                          {t.number}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                              {chosenTable && chosenTable !== ANY_TABLE && (
                                <p className="text-[12px] text-navy/70">Chosen: <b className="text-navy">{tableLabel(chosenTable)}</b></p>
                              )}
                              <p className="text-[11px] text-navy/45">Crossed-out tables are already booked at this time.</p>
                            </div>
                            {freeTables.length === 0 && (
                              <p className="mt-2 text-[12px] text-navy/60">No table for {form.guests} is free at this time. Please pick another time, or call or WhatsApp us and we will arrange one.</p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {type === "fish" && (
                      <div className="grid grid-cols-[1fr_96px] sm:grid-cols-[1fr_120px] gap-3 sm:gap-4 p-4 bg-cream/50 rounded-xl border border-navy/10">
                        <div>
                          <label htmlFor="b-fish" className={labelClass}>Which Fish? *</label>
                          <input id="b-fish" type="text" maxLength={60} value={form.fish_type} onChange={(e) => set({ fish_type: e.target.value })} placeholder="Enter the fish name" className={inputClass} />
                        </div>
                        <div>
                          <label htmlFor="b-weight" className={labelClass}>
                            Weight <span className="normal-case tracking-normal font-normal">(kg)</span>
                          </label>
                          <input id="b-weight" type="number" inputMode="decimal" min={0.1} max={50} step={0.1} value={form.fish_weight} onChange={(e) => set({ fish_weight: e.target.value })} placeholder="Enter kg" className={inputClass} />
                        </div>
                        <div className="col-span-2">
                          <span className={labelClass}>How Should We Cook It? *</span>
                          <div className="flex flex-wrap gap-2">
                            {[...styles, CHEF_CHOICE].map((s) => (
                              <button
                                key={s}
                                type="button"
                                aria-pressed={form.style === s}
                                onClick={() => set({ style: s })}
                                className={`px-3.5 py-2 rounded-full text-[12px] font-medium border transition-colors ${
                                  form.style === s ? "bg-navy text-white border-navy" : "bg-white text-navy border-navy/20 hover:border-navy"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <PreorderPicker dishes={dishes} value={form.items} onChange={(items) => set({ items })} />

                    {error && (
                      <p role="alert" className="text-[13px] text-offer bg-offer/5 border border-offer/20 rounded-lg px-4 py-3">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="w-full bg-navy text-white rounded-lg py-4 font-jost text-[10px] sm:text-[11px] font-bold tracking-[3px] uppercase hover:bg-ocean hover:text-navy transition-colors disabled:opacity-60"
                    >
                      {status === "sending" ? "Sending..." : type === "fish" ? "Send Fish Request" : "Request Table"}
                    </button>

                    <p className="text-[12px] text-navy/50 text-center leading-relaxed">
                      Prefer to talk?{" "}
                      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="text-navy font-semibold inline-flex items-center gap-1 hover:text-ocean">
                        <Phone size={12} /> {phone}
                      </a>{" "}
                      or{" "}
                      <a href={whatsapp(type === "fish" ? "Hello, I want to bring my own fish for preparation" : "Hello, I would like to book a table")} target="_blank" rel="noopener noreferrer" className="text-navy font-semibold hover:text-ocean">
                        WhatsApp us
                      </a>
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
      </main>
    </>
  );
}
