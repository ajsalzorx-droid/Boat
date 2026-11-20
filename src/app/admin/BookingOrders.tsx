"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronUp, Phone, User, Users, Utensils } from "lucide-react";
import { listUpcomingBookings, type BookingRow } from "./actions";
import { actionFailed } from "./client-helpers";
import Pagination from "./Pagination";
import { formatDate, formatTime, tableLabel, visitDate } from "@/lib/bookings";
import { formatPrice } from "@/lib/offers";

// The dashboard's "Table Bookings" tab: upcoming table bookings (new or confirmed), soonest first,
// with who booked, the table, the visit time and the food they pre-ordered. Confirming or
// cancelling is done in Admin -> Bookings (it also sends the WhatsApp confirmation).

const PAGE_SIZE = 8;
const POLL_MS = 15000;

const STATUS_STYLE: Record<string, string> = {
  new: "bg-orange-50 text-orange-700",
  confirmed: "bg-green-50 text-green-700",
};

export default function BookingOrders() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const pageRef = useRef(0);

  const load = async () => {
    const requested = pageRef.current;
    const res = await listUpcomingBookings(requested, PAGE_SIZE);
    if (requested !== pageRef.current) return;
    if (!res.ok) {
      if (res.status === 401) actionFailed(res);
      return;
    }
    setRows(res.data!.bookings);
    setTotal(res.data!.total);
    setLoaded(true);
  };

  useEffect(() => {
    const first = window.setTimeout(load, 0);
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const goTo = (p: number) => {
    pageRef.current = p;
    setPage(p);
    load();
  };

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!loaded) return <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading bookings...</div>;
  if (rows.length === 0)
    return (
      <div className="h-40 flex flex-col items-center justify-center text-gray-400">
        <CalendarDays size={40} className="mb-4 opacity-20" />
        <p className="font-playfair text-xl italic text-gray-400">No upcoming table bookings.</p>
      </div>
    );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {rows.map((b) => {
          const items = b.items ?? [];
          const count = items.reduce((n, i) => n + i.quantity, 0);
          const isOpen = open.has(b.id);
          return (
            <article key={b.id} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 md:p-5 border-b border-gray-100 bg-white flex flex-wrap justify-between items-start gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="flex items-start gap-1.5 text-lg sm:text-xl font-playfair font-bold text-navy leading-tight break-words">
                    <User size={16} className="shrink-0 mt-1 text-gray-400" aria-hidden />
                    <span className="min-w-0">{b.name}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {b.table && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-navy text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                        <Utensils size={11} aria-hidden /> {tableLabel(b.table)}
                      </span>
                    )}
                    <a href={`tel:${b.phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 rounded-full border border-ocean/40 text-ocean hover:bg-ocean/10 px-2.5 py-1 text-xs font-semibold">
                      <Phone size={12} aria-hidden /> {b.phone}
                    </a>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[b.status] ?? "bg-gray-100 text-gray-600"}`}>{b.status}</span>
                  {b.items_total ? <div className="text-sm font-bold text-navy mt-1.5 whitespace-nowrap">AED {formatPrice(b.items_total)}</div> : null}
                </div>
              </div>

              <div className="px-4 md:px-5 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-navy/80">
                <span className="flex items-center gap-1.5 font-semibold text-navy">
                  <CalendarDays size={14} className="text-gray-400" aria-hidden /> {formatDate(visitDate(b.date, b.time))} · {formatTime(b.time)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-gray-400" aria-hidden /> {b.guests} {b.guests === 1 ? "guest" : "guests"}
                </span>
              </div>

              <div className="p-4 md:p-5 flex-grow flex flex-col gap-3">
                {count === 0 ? (
                  <p className="text-xs text-gray-400 italic">No food pre-ordered.</p>
                ) : (
                  <>
                    <button
                      onClick={() => toggle(b.id)}
                      aria-expanded={isOpen}
                      aria-controls={`bitems-${b.id}`}
                      className="w-full flex items-center justify-between gap-2 rounded-lg border border-navy/15 bg-white px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy hover:border-navy transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Utensils size={14} aria-hidden />
                        {isOpen ? "Hide Pre-Order" : "View Pre-Order"}
                        <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px]">{count}</span>
                      </span>
                      {isOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                    </button>
                    {isOpen && (
                      <ul id={`bitems-${b.id}`} className="flex flex-col gap-2.5">
                        {items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="bg-navy text-white min-w-[24px] h-6 px-1 rounded flex items-center justify-center text-xs font-bold shrink-0">{item.quantity}</span>
                            <span className="text-sm font-medium text-navy/80 break-words min-w-0 flex-1">{item.name}</span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">AED {formatPrice(Math.round(item.price * item.quantity * 100) / 100)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {b.notes && <p className="text-xs text-navy/70 bg-white border border-gray-100 rounded-lg px-3 py-2 break-words">Note: {b.notes}</p>}
              </div>

              <div className="p-4 bg-white border-t border-gray-100">
                <Link
                  href="/admin/bookings"
                  className="w-full bg-navy hover:bg-ocean hover:text-navy text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wider no-underline"
                >
                  <CalendarDays size={16} aria-hidden />
                  {b.status === "new" ? "Confirm in Bookings" : "Open in Bookings"}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-6 md:mt-8">
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={goTo} noun="bookings" label="Booking pages" />
      </div>
    </>
  );
}
