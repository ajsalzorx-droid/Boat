"use client";

import { useState } from "react";
import { ChevronDown, Minus, Plus, Search, UtensilsCrossed } from "lucide-react";
import { formatPrice } from "@/lib/offers";
import { MAX_PREORDER_QTY, type PreorderLine } from "@/lib/bookings";

export type PreorderDish = {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number; // menu price
  offerPrice: number; // price now (offer applied)
  discount: number; // % off, 0 = none
};

// "Pre-order dishes" in the booking form: search the menu and pick quantities. Optional; the
// list opens on demand so the form stays short. The server prices the dishes again on sending.
export default function PreorderPicker({
  dishes,
  value,
  onChange,
}: {
  dishes: PreorderDish[];
  value: PreorderLine[];
  onChange: (lines: PreorderLine[]) => void;
}) {
  const [open, setOpen] = useState(value.length > 0);
  const [query, setQuery] = useState("");

  const qty = (id: string) => value.find((l) => l.id === id)?.quantity ?? 0;
  const setQty = (id: string, quantity: number) => {
    const q = Math.max(0, Math.min(MAX_PREORDER_QTY, quantity));
    onChange(q ? (qty(id) ? value.map((l) => (l.id === id ? { ...l, quantity: q } : l)) : [...value, { id, quantity: q }]) : value.filter((l) => l.id !== id));
  };

  const count = value.reduce((sum, l) => sum + l.quantity, 0);
  const total = value.reduce((sum, l) => sum + (dishes.find((d) => d.id === l.id)?.offerPrice ?? 0) * l.quantity, 0);
  const q = query.trim().toLowerCase();
  const shown = dishes.filter((d) => !q || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));

  if (!dishes.length) return null;

  return (
    <div className="rounded-xl border border-navy/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 bg-cream/50 text-left hover:bg-cream transition-colors"
      >
        <UtensilsCrossed size={16} className="text-navy/60 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[9px] sm:text-[10px] tracking-[2px] uppercase font-bold text-navy/70">
            Pre-order Dishes <span className="normal-case tracking-normal font-normal">(optional)</span>
          </span>
          <span className="block text-[12px] text-navy/60 truncate">
            {count ? `${count} ${count === 1 ? "dish" : "dishes"} · AED ${formatPrice(Math.round(total * 100) / 100)}` : "Choose from our menu so it's ready when you arrive"}
          </span>
        </span>
        <ChevronDown size={18} className={`text-navy/50 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-navy/10">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-navy/10">
            <Search size={15} className="text-navy/40 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a dish"
              aria-label="Search dishes"
              className="w-full bg-transparent text-[14px] text-navy placeholder:text-navy/30 outline-none"
            />
          </div>
          <ul className="divide-y divide-navy/5">
            {shown.length === 0 ? (
              <li className="px-4 py-4 text-[13px] text-navy/40 text-center">No dishes found.</li>
            ) : (
              shown.map((d) => {
                const n = qty(d.id);
                return (
                  <li key={d.id} className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 ${n ? "bg-ocean/5" : ""}`}>
                    {d.image ? (
                      <img src={d.image} alt="" loading="lazy" className="w-11 h-11 rounded-md object-cover shrink-0 bg-cream" />
                    ) : (
                      <div className="w-11 h-11 rounded-md bg-cream shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-navy leading-snug line-clamp-2">{d.name}</p>
                      <p className="text-[12px] text-navy/60">
                        {d.discount ? (
                          <>
                            <span className="line-through mr-1.5">AED {formatPrice(d.price)}</span>
                            <span className="text-offer font-semibold">AED {formatPrice(d.offerPrice)}</span>
                          </>
                        ) : (
                          <>AED {formatPrice(d.price)}</>
                        )}
                      </p>
                    </div>
                    {n ? (
                      <div className="flex items-center border border-navy/20 rounded-full shrink-0 bg-white">
                        <button type="button" onClick={() => setQty(d.id, n - 1)} aria-label={`One less ${d.name}`} className="p-1.5 text-navy/60 hover:text-navy">
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-[12px] font-bold text-navy" aria-live="polite">{n}</span>
                        <button type="button" onClick={() => setQty(d.id, n + 1)} disabled={n >= MAX_PREORDER_QTY} aria-label={`One more ${d.name}`} className="p-1.5 text-navy/60 hover:text-navy disabled:opacity-30">
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQty(d.id, 1)}
                        aria-label={`Add ${d.name}`}
                        className="flex items-center gap-1 shrink-0 border border-navy/20 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-navy hover:bg-navy hover:text-white transition-colors"
                      >
                        <Plus size={13} /> Add
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          {count > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-navy text-cream text-[12px]">
              <span>
                {count} {count === 1 ? "dish" : "dishes"} pre-ordered
              </span>
              <span className="font-bold">AED {formatPrice(Math.round(total * 100) / 100)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
