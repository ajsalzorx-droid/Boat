"use client";

import { useEffect, useRef, useState } from "react";
import { listBookings, setBookingStatus, deleteBooking, type BookingRow, type BookingStatusFilter, type BookingTypeFilter } from "../actions";
import { actionFailed } from "../client-helpers";
import Pagination from "../Pagination";
import { CalendarDays, Fish, Users, Phone, Mail, MessageCircle, Check, X, Trash2, RefreshCw, Clock, StickyNote, UtensilsCrossed } from "lucide-react";
import { formatPrice } from "@/lib/offers";
import { formatDate, formatTime, whatsappDigits, type BookingStatus } from "@/lib/bookings";

// Bookings per page (2 rows of 3 on wide screens)
const PAGE_SIZE = 9;
// New bookings show up without reloading
const POLL_MS = 30_000;

const TYPES: { value: BookingTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "table", label: "Table" },
  { value: "fish", label: "Fish Preparation" },
];

const STATUSES: { value: BookingStatusFilter; label: string }[] = [
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const STATUS_STYLE: Record<BookingStatus, string> = {
  new: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-200 text-gray-600",
};

type View = { type: BookingTypeFilter; status: BookingStatusFilter; page: number };

export default function AdminBookingsPage() {
  const [view, setView] = useState<View>({ type: "all", status: "new", page: 0 });
  const viewRef = useRef(view);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, new: 0, confirmed: 0, cancelled: 0 });
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const requested = viewRef.current;
    const res = await listBookings(requested.page, PAGE_SIZE, requested.type, requested.status);
    if (requested !== viewRef.current) return; // another filter or page was opened meanwhile
    if (!res.ok) {
      if (res.status === 401 || !loaded) actionFailed(res);
      return;
    }
    const { bookings: rows, total, counts } = res.data!;
    // This page has emptied (e.g. bookings confirmed): go to the last page that still has some
    if (rows.length === 0 && total > 0 && requested.page > 0) {
      show({ ...requested, page: Math.ceil(total / PAGE_SIZE) - 1 });
      return;
    }
    setBookings(rows);
    setTotal(total);
    setCounts(counts);
    setLoaded(true);
  };

  const show = (next: View) => {
    viewRef.current = next;
    setView(next);
    if (next.type !== view.type || next.status !== view.status) setLoaded(false);
    load();
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeStatus = async (b: BookingRow, status: BookingStatus) => {
    if (status === "cancelled" && !confirm(`Cancel the booking for ${b.name}?`)) return;
    // Confirm also opens WhatsApp with the confirmation message to the customer (staff tap Send).
    // The tab is opened right away, during the click, so the browser doesn't block it as a popup;
    // it gets the WhatsApp address once the booking is saved as confirmed.
    const tab = status === "confirmed" ? window.open("", "_blank") : null;
    if (actionFailed(await setBookingStatus(b.id, status))) {
      tab?.close();
      return;
    }
    if (tab) tab.location.href = whatsappLink(b);
    load();
  };

  const remove = async (b: BookingRow) => {
    if (!confirm(`Delete the booking for ${b.name}? This cannot be undone.`)) return;
    if (actionFailed(await deleteBooking(b.id))) return;
    load();
  };

  // Prefilled WhatsApp message to confirm with the customer
  const whatsappLink = (b: BookingRow) => {
    const what =
      (b.type === "fish" ? `your fish preparation (${b.fish_type})` : `your table for ${b.guests}`) +
      (b.items?.length ? ` with ${b.items.length} pre-ordered ${b.items.length === 1 ? "dish" : "dishes"}` : "");
    const text = `Hello ${b.name}, this is Boat Seafood Restaurant. We confirm ${what} on ${formatDate(b.date)} at ${formatTime(b.time)}. See you soon!`;
    return `https://wa.me/${whatsappDigits(b.phone)}?text=${encodeURIComponent(text)}`;
  };

  const statusLabel = STATUSES.find((s) => s.value === view.status)!.label.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Bookings</h1>
          <p className="text-sm md:text-base text-gray-500">Table reservations and fish-preparation requests from the website (/book).</p>
        </div>
        <button
          onClick={load}
          className="flex items-center justify-center gap-2 whitespace-nowrap bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg transition-all shrink-0"
        >
          <RefreshCw size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Refresh</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Booking type" className="flex gap-1 p-1 bg-gray-100 rounded-lg w-full sm:w-fit">
          {TYPES.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={view.type === t.value}
              onClick={() => show({ ...view, type: t.value, page: 0 })}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                view.type === t.value ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div aria-label="Booking status" className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              aria-pressed={view.status === s.value}
              onClick={() => show({ ...view, status: s.value, page: 0 })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                view.status === s.value ? "bg-navy text-white border-navy" : "bg-white text-gray-500 border-gray-200 hover:text-navy"
              }`}
            >
              {s.label}
              <span className={`min-w-5 px-1.5 rounded-full text-[10px] ${view.status === s.value ? "bg-white/20" : "bg-gray-100"}`}>{counts[s.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <p className="p-10 text-center text-gray-400 bg-white rounded-xl border border-gray-100">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-gray-100">
          <CalendarDays size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-playfair text-xl italic text-gray-400">No {view.status === "all" ? "" : `${statusLabel} `}bookings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {bookings.map((b) => (
            <article key={b.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${b.status === "cancelled" ? "opacity-60" : ""}`}>
              <div className="p-4 md:p-5 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${b.type === "fish" ? "text-ocean" : "text-navy/70"}`}>
                    {b.type === "fish" ? <Fish size={13} /> : <CalendarDays size={13} />}
                    {b.type === "fish" ? "Fish Preparation" : "Table"}
                  </span>
                  <p className="font-playfair text-xl font-bold text-navy leading-tight">{formatDate(b.date)}</p>
                  <p className="text-sm font-semibold text-navy/80 mt-0.5">
                    {formatTime(b.time)} · {b.guests} {b.guests === 1 ? "guest" : "guests"}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${STATUS_STYLE[b.status]}`}>{b.status}</span>
              </div>

              <div className="p-4 md:p-5 flex flex-col gap-2 text-sm flex-grow">
                <p className="flex items-center gap-2 text-navy font-semibold"><Users size={14} className="text-gray-400 shrink-0" /> {b.name}</p>
                <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-ocean font-medium hover:text-navy w-fit">
                  <Phone size={14} className="shrink-0" /> {b.phone}
                </a>
                {b.email && (
                  <a href={`mailto:${b.email}`} className="flex items-center gap-2 text-ocean font-medium hover:text-navy min-w-0">
                    <Mail size={14} className="shrink-0" /> <span className="truncate">{b.email}</span>
                  </a>
                )}
                {b.type === "fish" && (
                  <div className="mt-1 p-3 bg-ocean/10 rounded-lg text-navy">
                    <p className="flex items-center gap-2 font-semibold"><Fish size={14} className="shrink-0" /> {b.fish_type}{b.fish_weight ? ` · ${b.fish_weight} kg` : ""}</p>
                    <p className="text-xs text-navy/70 mt-1">Cook it: <b>{b.style}</b></p>
                  </div>
                )}
                {b.items && b.items.length > 0 && (
                  <div className="mt-1 rounded-lg border border-gray-100 overflow-hidden">
                    <p className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <UtensilsCrossed size={13} className="shrink-0" /> Pre-ordered dishes
                    </p>
                    <ul className="divide-y divide-gray-50">
                      {b.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 px-3 py-1.5">
                          <span className="bg-navy text-white min-w-[22px] h-[22px] rounded flex items-center justify-center text-[11px] font-bold shrink-0">{item.quantity}</span>
                          <span className="flex-1 min-w-0 text-navy/80">{item.name}</span>
                          <span className="text-gray-500 whitespace-nowrap">AED {formatPrice(Math.round(item.price * item.quantity * 100) / 100)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="flex justify-between px-3 py-2 bg-gray-50 font-bold text-navy">
                      <span>Total</span>
                      <span>AED {formatPrice(b.items_total ?? 0)}</span>
                    </p>
                  </div>
                )}
                {b.notes && (
                  <p className="flex items-start gap-2 text-gray-600 bg-gray-50 rounded-lg p-3 mt-1 whitespace-pre-line break-words">
                    <StickyNote size={14} className="text-gray-400 shrink-0 mt-0.5" /> {b.notes}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-auto pt-2">
                  <Clock size={11} /> Received {new Date(b.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div className="p-3 md:p-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
                {b.status !== "confirmed" && (
                  <button onClick={() => changeStatus(b, "confirmed")} className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                    <Check size={15} /> Confirm
                  </button>
                )}
                <a
                  href={whatsappLink(b)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Message the customer on WhatsApp"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
                {b.status !== "cancelled" && (
                  <button onClick={() => changeStatus(b, "cancelled")} title="Cancel booking" aria-label={`Cancel booking for ${b.name}`} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                )}
                <button onClick={() => remove(b)} title="Delete booking" aria-label={`Delete booking for ${b.name}`} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={view.page}
        pageSize={PAGE_SIZE}
        total={total}
        onPage={(p) => show({ ...view, page: p })}
        disabled={!loaded}
        noun={view.status === "all" ? "bookings" : `${statusLabel} bookings`}
        label="Bookings pages"
      />
    </div>
  );
}
