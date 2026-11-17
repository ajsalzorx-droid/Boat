"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gamepad2, Fish, Phone, MessageCircle, Search, RefreshCw, Receipt, Check, Clock, BellRing } from "lucide-react";
import { applyGameClaim, listGameClaims, type GameClaimFilter, type GameClaimRow } from "../actions";
import { actionFailed } from "../client-helpers";
import Pagination from "../Pagination";
import { formatPrice } from "@/lib/offers";
import { formatPercent, RULES } from "@/lib/game-claims";

// Catbo Racing played for a discount (src/lib/game-claims.ts). At the till: search the customer's
// code (or phone number), enter the bill number and amount, and apply the discount: once per claim.
const PAGE_SIZE = 12;
const POLL_MS = 30_000;

const FILTERS: { value: GameClaimFilter; label: string }[] = [
  { value: "ready", label: "Ready to use" },
  { value: "used", label: "Used" },
  { value: "all", label: "All" },
];

const STATUS_STYLE: Record<GameClaimRow["status"], string> = {
  open: "bg-green-100 text-green-700",
  used: "bg-gray-200 text-gray-600",
  expired: "bg-red-50 text-red-500",
};

type View = { search: string; filter: GameClaimFilter; page: number };

const when = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminGameClaimsPage() {
  const [view, setView] = useState<View>({ search: "", filter: "ready", page: 0 });
  const viewRef = useRef(view);
  const [typed, setTyped] = useState("");
  const [claims, setClaims] = useState<GameClaimRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ ready: 0, used: 0, all: 0 });
  const [offersCount, setOffersCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    const requested = viewRef.current;
    const res = await listGameClaims(requested.search, requested.filter, requested.page, PAGE_SIZE);
    if (requested !== viewRef.current) return;
    if (!res.ok) {
      if (res.status === 401 || !loaded) actionFailed(res);
      return;
    }
    const d = res.data!;
    if (d.claims.length === 0 && d.total > 0 && requested.page > 0) {
      show({ ...requested, page: Math.ceil(d.total / PAGE_SIZE) - 1 });
      return;
    }
    setClaims(d.claims);
    setTotal(d.total);
    setCounts(d.counts);
    setOffersCount(d.offersCount);
    setLoaded(true);
  };

  const show = (next: View) => {
    viewRef.current = next;
    setView(next);
    if (next.filter !== view.filter || next.search !== view.search) setLoaded(false);
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

  // A search looks through every claim, used ones too, so the code is found whatever its state
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    show({ search: typed.trim(), filter: typed.trim() ? "all" : view.filter, page: 0 });
  };

  const applied = (row: GameClaimRow) => {
    setNotice(`Applied: ${formatPercent(row.percent)}% off bill ${row.bill_no} for ${row.name}, AED ${formatPrice(row.discount_amount ?? 0)} discount.`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Game Claims</h1>
          <p className="text-sm md:text-base text-gray-500">
            Catbo Racing discounts: {RULES}. Search the customer&rsquo;s code and apply it to their bill.
          </p>
        </div>
        <button onClick={load} className="flex items-center justify-center gap-2 whitespace-nowrap bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg transition-all shrink-0">
          <RefreshCw size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Refresh</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <form onSubmit={search} className="flex gap-2 w-full lg:max-w-md">
          <label htmlFor="claim-search" className="sr-only">Claim code or phone number</label>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              id="claim-search"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Claim code or phone number"
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-navy uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-ocean/40"
            />
          </div>
          <button type="submit" className="bg-navy text-white px-4 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-navy/90">Find</button>
          {view.search && (
            <button
              type="button"
              onClick={() => {
                setTyped("");
                show({ search: "", filter: "ready", page: 0 });
              }}
              className="px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-navy"
            >
              Clear
            </button>
          )}
        </form>
        <div aria-label="Claim status" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              aria-pressed={view.filter === f.value}
              onClick={() => show({ ...view, filter: f.value, page: 0 })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                view.filter === f.value ? "bg-navy text-white border-navy" : "bg-white text-gray-500 border-gray-200 hover:text-navy"
              }`}
            >
              {f.label}
              <span className={`min-w-5 px-1.5 rounded-full text-[10px] ${view.filter === f.value ? "bg-white/20" : "bg-gray-100"}`}>{counts[f.value]}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="flex items-start gap-2 text-sm text-gray-600 bg-white border border-gray-100 rounded-xl p-3.5">
        <BellRing size={16} className="text-ocean shrink-0 mt-0.5" />
        <span>
          <b>{offersCount}</b> {offersCount === 1 ? "player has" : "players have"} agreed to offers on WhatsApp. They are messaged with your other customers when you add an offer with
          &ldquo;Send on WhatsApp&rdquo; in <Link href="/admin/offers" className="text-ocean font-semibold hover:text-navy">Offers</Link>.
        </span>
      </p>

      {notice && (
        <div role="status" className="flex items-center gap-3 bg-green-50 border border-green-100 text-green-800 p-3.5 rounded-xl text-sm">
          <Check size={18} className="shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Close" className="p-1 hover:bg-green-100 rounded text-lg leading-none">×</button>
        </div>
      )}

      {!loaded ? (
        <p className="p-10 text-center text-gray-400 bg-white rounded-xl border border-gray-100">Loading claims...</p>
      ) : claims.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-gray-100">
          <Gamepad2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-playfair text-xl italic text-gray-400">{view.search ? `No claim found for “${view.search}”.` : view.filter === "ready" ? "No discounts waiting to be used." : "No claims yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {claims.map((c) => (
            <ClaimCard key={c.id} claim={c} onApplied={applied} />
          ))}
        </div>
      )}

      <Pagination page={view.page} pageSize={PAGE_SIZE} total={total} onPage={(p) => show({ ...view, page: p })} disabled={!loaded} noun="claims" label="Claims pages" />
    </div>
  );
}

function ClaimCard({ claim: c, onApplied }: { claim: GameClaimRow; onApplied: (row: GameClaimRow) => void }) {
  const [billNo, setBillNo] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const usable = c.status === "open" && c.percent > 0;
  const bill = Number(amount);
  const discount = bill > 0 ? Math.round(bill * c.percent) / 100 : 0;

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Apply ${formatPercent(c.percent)}% (AED ${formatPrice(discount)}) to bill ${billNo} for ${c.name}? A claim can be used only once.`)) return;
    setSaving(true);
    const res = await applyGameClaim(c.id, billNo, bill);
    setSaving(false);
    if (actionFailed(res) || !res.ok || !res.data) return;
    onApplied(res.data);
  };

  return (
    <article className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${c.status !== "open" ? "opacity-75" : ""}`}>
      <div className="p-4 md:p-5 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Claim code</p>
          <p className="font-mono text-2xl font-bold tracking-[3px] text-navy">{c.code}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${STATUS_STYLE[c.status]}`}>{c.status === "open" ? (c.percent > 0 ? "ready" : "no discount") : c.status}</span>
      </div>

      <div className="p-4 md:p-5 flex flex-col gap-2 text-sm flex-grow">
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-ocean/10 text-navy">
          <span className="flex items-center gap-2 font-semibold"><Fish size={15} className="shrink-0" /> {c.fish ?? 0} fish</span>
          <span className="font-playfair text-2xl font-bold">{formatPercent(c.percent)}% off</span>
        </div>
        <p className="text-navy font-semibold">{c.name}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-ocean font-medium hover:text-navy w-fit">
            <Phone size={14} className="shrink-0" /> {c.phone}
          </a>
          <a href={`https://wa.me/${c.phone_digits}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#128C7E] font-medium hover:text-navy w-fit">
            <MessageCircle size={14} className="shrink-0" /> WhatsApp
          </a>
        </div>
        <p className="text-[12px] text-gray-500">
          {c.offers ? "Agreed to offers on WhatsApp" : "Did not ask for offers"} · {c.chances_used} of 2 chances played{c.locked ? ", score kept" : ""}
        </p>
        {c.status === "used" && (
          <p className="flex items-start gap-2 text-navy bg-gray-50 rounded-lg p-3 mt-1">
            <Receipt size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <span>
              Used on bill <b>{c.bill_no}</b>: AED {formatPrice(c.bill_amount ?? 0)}, discount AED {formatPrice(c.discount_amount ?? 0)}
              {c.used_at && <span className="block text-[11px] text-gray-400">{when(c.used_at)}</span>}
            </span>
          </p>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-auto pt-2">
          <Clock size={11} /> Played {when(c.created_at)} · {c.status === "expired" ? "expired" : `valid until ${new Date(c.expires_at).toLocaleDateString([], { day: "numeric", month: "short" })}`}
        </p>
      </div>

      {usable && (
        <form onSubmit={apply} className="p-3 md:p-4 border-t border-gray-100 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Bill no.
              <input value={billNo} onChange={(e) => setBillNo(e.target.value)} required maxLength={40} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-navy text-sm normal-case font-normal tracking-normal" />
            </label>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Bill (AED)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} required type="number" min="0.01" step="0.01" inputMode="decimal" className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-navy text-sm normal-case font-normal tracking-normal" />
            </label>
          </div>
          <button type="submit" disabled={saving || !billNo.trim() || !(bill > 0)} className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
            <Check size={15} /> {bill > 0 ? `Apply ${formatPercent(c.percent)}%: AED ${formatPrice(discount)} off` : `Apply ${formatPercent(c.percent)}% to bill`}
          </button>
        </form>
      )}
    </article>
  );
}
