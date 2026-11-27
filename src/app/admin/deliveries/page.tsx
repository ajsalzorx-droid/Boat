"use client";

import { useEffect, useRef, useState } from "react";
import { deleteDelivery, listDeliveries, resendDeliveryConfirmation, setDeliveryStatus, type DeliveryRow, type DeliveryStatusFilter } from "../actions";
import { actionFailed, confirmDialog, cookingTimeDialog } from "../client-helpers";
import { toast } from "../Toaster";
import Pagination from "../Pagination";
import { Check, ChefHat, Clock, MapPin, MessageCircle, Phone, RefreshCw, Trash2, Truck, Users, UtensilsCrossed, X } from "lucide-react";
import { formatPrice } from "@/lib/offers";
import { cookingLabel, dubaiClock, type DeliveryStatus } from "@/lib/deliveries";

// Admin -> Delivery: delivery orders from the website (a dish's "Add to order" -> Delivery).
// Confirm asks for the cooking time, sends the food to the kitchen screen and the customer a WhatsApp
// confirmation from Boat's number (with the cooking time and when it is ready).

// Deliveries per page (3 rows of 3 on wide screens)
const PAGE_SIZE = 9;
// New deliveries show up without reloading
const POLL_MS = 20_000;

const STATUSES: { value: DeliveryStatusFilter; label: string }[] = [
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const STATUS_STYLE: Record<DeliveryStatus, string> = {
  new: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-200 text-gray-600",
};

type View = { status: DeliveryStatusFilter; page: number };

const when = (d: string) => new Date(d).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminDeliveriesPage() {
  const [view, setView] = useState<View>({ status: "new", page: 0 });
  const viewRef = useRef(view);
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, new: 0, confirmed: 0, cancelled: 0 });
  const [loaded, setLoaded] = useState(false);
  // true = the WhatsApp API is set up: Confirm sends the message from the restaurant's number
  const [whatsappApi, setWhatsappApi] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    const requested = viewRef.current;
    const res = await listDeliveries(requested.page, PAGE_SIZE, requested.status);
    if (requested !== viewRef.current) return; // another filter or page was opened meanwhile
    if (!res.ok) {
      if (res.status === 401 || !loaded) actionFailed(res);
      return;
    }
    const { deliveries, total, counts, whatsappApi } = res.data!;
    setWhatsappApi(whatsappApi);
    // This page has emptied (e.g. deliveries confirmed): go to the last page that still has some
    if (deliveries.length === 0 && total > 0 && requested.page > 0) {
      show({ ...requested, page: Math.ceil(total / PAGE_SIZE) - 1 });
      return;
    }
    setRows(deliveries);
    setTotal(total);
    setCounts(counts);
    setLoaded(true);
  };

  const show = (next: View) => {
    viewRef.current = next;
    setView(next);
    if (next.status !== view.status) setLoaded(false);
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

  const confirm = async (d: DeliveryRow) => {
    const minutes = await cookingTimeDialog({
      title: `Confirm ${d.name}'s delivery?`,
      text: `How long will it take to cook?\nIt goes to the kitchen screen, and ${d.name} gets the confirmation with this time on WhatsApp.`,
      confirmText: "Confirm order",
    });
    if (minutes === null) return;
    const res = await setDeliveryStatus(d.id, "confirmed", minutes);
    if (actionFailed(res)) return;
    const wa = res.ok ? res.data : undefined;
    toast(`Delivery for ${d.name} confirmed: ${cookingLabel(minutes)}`);
    if (wa?.whatsapp === "sent") setNotice(`Confirmed. WhatsApp message sent to ${d.name} (${d.phone}) from Boat's number.`);
    if (wa?.whatsapp === "failed") toast(`Delivery confirmed, but the WhatsApp message was not sent: ${wa.error}`, "error");
    load();
  };

  const cancel = async (d: DeliveryRow) => {
    const ok = await confirmDialog({ title: "Cancel this delivery?", text: `The delivery for ${d.name} will be marked as cancelled.`, confirmText: "Yes, cancel it", cancelText: "Keep it", danger: true });
    if (!ok) return;
    if (actionFailed(await setDeliveryStatus(d.id, "cancelled"))) return;
    toast(`Delivery for ${d.name} cancelled`);
    load();
  };

  const resend = async (d: DeliveryRow) => {
    const res = await resendDeliveryConfirmation(d.id);
    if (actionFailed(res)) return;
    const wa = res.ok ? res.data : undefined;
    if (wa?.whatsapp === "sent") setNotice(`WhatsApp message sent to ${d.name} (${d.phone}) from Boat's number.`);
    else toast(`WhatsApp message not sent: ${wa?.error ?? "please try again"}`, "error");
    load();
  };

  const remove = async (d: DeliveryRow) => {
    const ok = await confirmDialog({ title: "Delete this delivery?", text: `The delivery for ${d.name} will be deleted. This cannot be undone.`, confirmText: "Yes, delete", danger: true });
    if (!ok) return;
    if (actionFailed(await deleteDelivery(d.id))) return;
    toast("Delivery deleted");
    load();
  };

  const statusLabel = STATUSES.find((s) => s.value === view.status)!.label.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Delivery</h1>
          <p className="text-sm md:text-base text-gray-500">Delivery orders from the website. Confirm one to set its cooking time and send it to the kitchen.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center justify-center gap-2 whitespace-nowrap bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg transition-all shrink-0"
        >
          <RefreshCw size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Refresh</span>
        </button>
      </div>

      <div aria-label="Delivery status" className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            aria-pressed={view.status === s.value}
            onClick={() => show({ status: s.value, page: 0 })}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
              view.status === s.value ? "bg-navy text-white border-navy" : "bg-white text-gray-500 border-gray-200 hover:text-navy"
            }`}
          >
            {s.label}
            <span className={`min-w-5 px-1.5 rounded-full text-[10px] ${view.status === s.value ? "bg-white/20" : "bg-gray-100"}`}>{counts[s.value]}</span>
          </button>
        ))}
      </div>

      {loaded && !whatsappApi && (
        <div role="note" className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-sm">
          <MessageCircle size={18} className="shrink-0 mt-0.5" />
          <span>
            Delivery messages can&rsquo;t be sent from Boat&rsquo;s WhatsApp number: the WhatsApp API (Wati) is not set up on this server. You can still confirm deliveries and use &ldquo;Send WhatsApp&rdquo; once it is.
          </span>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-center gap-3 bg-green-50 border border-green-100 text-green-800 p-3.5 rounded-xl text-sm">
          <MessageCircle size={18} className="shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Close" className="p-1 hover:bg-green-100 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {!loaded ? (
        <p className="p-10 text-center text-gray-400 bg-white rounded-xl border border-gray-100">Loading deliveries...</p>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-gray-100">
          <Truck size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-playfair text-xl italic text-gray-400">No {view.status === "all" ? "" : `${statusLabel} `}deliveries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {rows.map((d) => (
            <article key={d.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${d.status === "cancelled" ? "opacity-60" : ""}`}>
              <div className="p-4 md:p-5 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 text-emerald-700">
                    <Truck size={13} /> Delivery
                  </span>
                  <p className="font-playfair text-xl font-bold text-navy leading-tight">AED {formatPrice(d.items_total)}</p>
                  <p className="text-sm font-semibold text-navy/70 mt-0.5">
                    {d.items.reduce((n, i) => n + i.quantity, 0)} {d.items.reduce((n, i) => n + i.quantity, 0) === 1 ? "dish" : "dishes"} · {when(d.created_at)}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${STATUS_STYLE[d.status]}`}>{d.status}</span>
              </div>

              <div className="p-4 md:p-5 flex flex-col gap-2 text-sm flex-grow">
                <p className="flex items-center gap-2 text-navy font-semibold"><Users size={14} className="text-gray-400 shrink-0" /> {d.name}</p>
                <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-ocean font-medium hover:text-navy w-fit">
                  <Phone size={14} className="shrink-0" /> {d.phone}
                </a>
                <p className="flex items-start gap-2 text-gray-700 break-words">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span className="min-w-0">
                    {d.location}
                    {d.location_map && (
                      <a href={d.location_map} target="_blank" rel="noopener noreferrer" className="ml-2 whitespace-nowrap text-xs font-bold text-ocean hover:underline">
                        Open map
                      </a>
                    )}
                  </span>
                </p>

                <div className="mt-1 rounded-lg border border-gray-100 overflow-hidden">
                  <p className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <UtensilsCrossed size={13} className="shrink-0" /> Dishes
                  </p>
                  <ul className="divide-y divide-gray-50">
                    {d.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 px-3 py-1.5">
                        <span className="bg-navy text-white min-w-[22px] h-[22px] rounded flex items-center justify-center text-[11px] font-bold shrink-0">{item.quantity}</span>
                        <span className="flex-1 min-w-0 text-navy/80">{item.name}</span>
                        <span className="text-gray-500 whitespace-nowrap">AED {formatPrice(Math.round(item.price * item.quantity * 100) / 100)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="flex justify-between px-3 py-2 bg-gray-50 font-bold text-navy">
                    <span>Total</span>
                    <span>AED {formatPrice(d.items_total)}</span>
                  </p>
                </div>

                {d.status === "confirmed" && d.cooking_minutes ? (
                  <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-green-800 font-semibold">
                    <ChefHat size={15} className="shrink-0 mt-0.5" />
                    <span>
                      Cooking {cookingLabel(d.cooking_minutes)}
                      {d.ready_at && <span className="font-normal"> · ready about {dubaiClock(d.ready_at)}</span>}
                    </span>
                  </p>
                ) : null}

                {d.whatsapp_sent_at ? (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#128C7E] mt-1">
                    <MessageCircle size={12} /> Confirmation sent on WhatsApp
                  </p>
                ) : d.whatsapp_error ? (
                  <p className="flex items-start gap-1.5 text-[11px] text-red-500 mt-1">
                    <MessageCircle size={12} className="shrink-0 mt-0.5" /> WhatsApp not sent: {d.whatsapp_error}
                  </p>
                ) : null}
                <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-auto pt-2">
                  <Clock size={11} /> Received {when(d.created_at)}
                  {d.received_sent_at && <span className="text-[#128C7E]">· order-received WhatsApp sent</span>}
                </p>
              </div>

              <div className="p-3 md:p-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
                {d.status !== "confirmed" && (
                  <button onClick={() => confirm(d)} className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                    <Check size={15} /> Confirm
                  </button>
                )}
                {d.status === "confirmed" && !d.whatsapp_sent_at && (
                  <button
                    onClick={() => resend(d)}
                    title="Send the confirmation from Boat's WhatsApp number"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <MessageCircle size={15} /> Send WhatsApp
                  </button>
                )}
                {d.status !== "cancelled" && (
                  <button onClick={() => cancel(d)} title="Cancel delivery" aria-label={`Cancel delivery for ${d.name}`} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                )}
                <button onClick={() => remove(d)} title="Delete delivery" aria-label={`Delete delivery for ${d.name}`} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
        noun={view.status === "all" ? "deliveries" : `${statusLabel} deliveries`}
        label="Delivery pages"
      />
    </div>
  );
}
