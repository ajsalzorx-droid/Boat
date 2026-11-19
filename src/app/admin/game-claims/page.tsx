"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gamepad2, Fish, Phone, MessageCircle, RefreshCw, Receipt, Check, Clock, BellRing, Trash2 } from "lucide-react";
import { applyGameClaim, deleteGameClaim, type GameClaimFilter, type GameClaimRow } from "../actions";
import { actionFailed, confirmDialog } from "../client-helpers";
import { toast } from "../Toaster";
import Pagination from "../Pagination";
import SearchBox from "../SearchBox";
import { useAbortableFetch, useDebouncedSearch } from "../use-admin-list";
import { formatPrice } from "@/lib/offers";
import { CLAIM_CHANCES, formatPercent, RULES } from "@/lib/game-claims";

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

type ClaimsData = {
  claims: GameClaimRow[];
  total: number;
  counts: Record<GameClaimFilter, number>;
  offersCount: number;
};

const when = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminGameClaimsPage() {
  const [filter, setFilter] = useState<GameClaimFilter>("ready");
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  // Live search as the till types (debounced; older requests are aborted). A search looks
  // through every claim, used ones too, so the code is found whatever its state; clearing it
  // goes back to the claims ready to use.
  const s = useDebouncedSearch((q) => {
    setFilter(q ? "all" : "ready");
    setPage(0);
  });
  const url = `/api/admin/game-claims?${new URLSearchParams({ q: s.query, filter, page: String(page), size: String(PAGE_SIZE) })}`;
  const list = useAbortableFetch<ClaimsData>(url, {
    onData: (d) => {
      // The page no longer exists: go to the last one that does
      if (d.claims.length === 0 && d.total > 0 && page > 0) {
        setPage(Math.max(Math.ceil(d.total / PAGE_SIZE) - 1, 0));
        return false;
      }
    },
  });
  const { reload } = list;
  const claims = list.data?.claims ?? [];
  const total = list.data?.total ?? 0;
  const counts = list.data?.counts ?? { ready: 0, used: 0, all: 0 };
  const offersCount = list.data?.offersCount ?? 0;
  // A new search, filter or page on its way (not the quiet 30s refresh): dim the old cards
  const busy = !list.loading && (s.typing || list.changing);

  // New claims show up without reloading
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) reload();
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only bumps a counter
  }, []);

  const showFilter = (f: GameClaimFilter) => {
    setFilter(f);
    setPage(0);
  };

  const applied = (row: GameClaimRow) => {
    setNotice(`Applied: ${formatPercent(row.percent)}% off bill ${row.bill_no} for ${row.name}, AED ${formatPrice(row.discount_amount ?? 0)} discount.`);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Game Claims</h1>
          <p className="text-sm md:text-base text-gray-500">
            Catbo Racing discounts: {RULES}. Search the customer&rsquo;s code and apply it to their bill. One game discount per bill: a group uses one person&rsquo;s code.
          </p>
        </div>
        <button onClick={reload} className="flex items-center justify-center gap-2 whitespace-nowrap bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg transition-all shrink-0">
          <RefreshCw size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Refresh</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          <SearchBox
            value={s.search}
            onChange={s.setSearch}
            onEnter={s.searchNow}
            onClear={s.clearSearch}
            busy={busy}
            placeholder="Claim code, phone or name"
            label="Search claims by code, phone number or name"
            inputClassName="uppercase placeholder:normal-case"
          />
        </div>
        <div aria-label="Claim status" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              aria-pressed={filter === f.value}
              onClick={() => showFilter(f.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                filter === f.value ? "bg-navy text-white border-navy" : "bg-white text-gray-500 border-gray-200 hover:text-navy"
              }`}
            >
              {f.label}
              <span className={`min-w-5 px-1.5 rounded-full text-[10px] ${filter === f.value ? "bg-white/20" : "bg-gray-100"}`}>{counts[f.value]}</span>
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

      {list.loading ? (
        <p className="p-10 text-center text-gray-400 bg-white rounded-xl border border-gray-100">Loading claims...</p>
      ) : claims.length === 0 ? (
        <div className={`p-10 text-center bg-white rounded-xl border border-gray-100 transition-opacity duration-150 ${busy ? "opacity-60" : ""}`}>
          <Gamepad2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-playfair text-xl italic text-gray-400">{s.query ? `No claim found for “${s.query}”.` : filter === "ready" ? "No discounts waiting to be used." : "No claims yet."}</p>
        </div>
      ) : (
        // The old cards stay (dimmed) until the new results arrive: no blank flash while typing
        <div aria-busy={busy} className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 transition-opacity duration-150 ${busy ? "opacity-60" : ""}`}>
          {claims.map((c) => (
            <ClaimCard key={c.id} claim={c} onApplied={applied} onDeleted={reload} />
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} disabled={list.loading} noun="claims" label="Claims pages" />
    </div>
  );
}

function ClaimCard({
  claim: c,
  onApplied,
  onDeleted,
}: {
  claim: GameClaimRow;
  onApplied: (row: GameClaimRow) => void;
  onDeleted: () => void;
}) {
  const [billNo, setBillNo] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Any claim can be deleted; a ready one gets a clear warning (it is still the customer's discount)
  const remove = async () => {
    const what =
      c.status === "used"
        ? `Claim ${c.code} for ${c.name}, used on bill ${c.bill_no ?? ""}, will be deleted.`
        : c.status === "open" && c.percent > 0
          ? `Claim ${c.code} for ${c.name} has NOT been used yet. Deleting it removes their ${formatPercent(c.percent)}% discount.`
          : `Claim ${c.code} for ${c.name} will be deleted.`;
    const ok = await confirmDialog({
      title: "Delete this claim?",
      text: `${what}\nThis can't be undone.`,
      confirmText: "Yes, delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    const res = await deleteGameClaim(c.id);
    setDeleting(false);
    if (actionFailed(res)) return;
    toast("Claim deleted");
    onDeleted();
  };
  const usable = c.status === "open" && c.percent > 0;
  const bill = Number(amount);
  const discount = bill > 0 ? Math.round(bill * c.percent) / 100 : 0;
  const toPay = Math.max(Math.round((bill - discount) * 100) / 100, 0);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirmDialog({
      title: "Apply this discount?",
      text: `${formatPercent(c.percent)}% (AED ${formatPrice(discount)}) off bill ${billNo} for ${c.name}.\nCustomer pays AED ${formatPrice(toPay)}.\n\nA claim can be used only once.`,
      confirmText: "Yes, apply",
    });
    if (!ok) return;
    setSaving(true);
    const res = await applyGameClaim(c.id, billNo, bill);
    setSaving(false);
    if (actionFailed(res) || !res.ok || !res.data) return;
    toast(`Discount applied to bill ${billNo}`);
    onApplied(res.data);
  };

  return (
    <article className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${c.status !== "open" ? "opacity-75" : ""}`}>
      <div className="p-4 md:p-5 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Claim code</p>
          <p className="font-mono text-2xl font-bold tracking-[3px] text-navy">{c.code}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[c.status]}`}>{c.status === "open" ? (c.percent > 0 ? "ready" : "no discount") : c.status}</span>
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            aria-label={`Delete claim ${c.code}`}
            title="Delete claim"
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={16} className={deleting ? "animate-pulse" : ""} />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-5 flex flex-col gap-2 text-sm flex-grow">
        {/* The discount to give: the race the customer chose (or, not chosen yet, their best) */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-ocean/10 text-navy">
          <span className="flex flex-col">
            <span className="flex items-center gap-2 font-semibold"><Fish size={15} className="shrink-0" /> {c.fish ?? 0} fish</span>
            <span className="text-[11px] text-navy/60">
              {c.chosen_chance ? `Customer chose race ${c.chosen_chance}` : c.scores.length > 1 ? "Not chosen yet: best race" : c.scores.length ? "Race 1" : "No race yet"}
            </span>
          </span>
          <span className="font-playfair text-2xl font-bold">{formatPercent(c.percent)}% off</span>
        </div>
        {/* Every race played, the chosen one marked */}
        {c.scores.length > 1 && (
          <ul className="flex flex-col gap-1 text-[12px]">
            {c.scores.map((r) => (
              <li key={r.chance} className={`flex justify-between rounded-md px-2.5 py-1.5 ${c.chosen_chance === r.chance ? "bg-green-50 text-green-800 font-semibold" : "bg-gray-50 text-gray-600"}`}>
                <span>Race {r.chance}: {r.fish} fish{c.chosen_chance === r.chance ? " ✓ chosen" : ""}</span>
                <span>{formatPercent(r.percent)}%</span>
              </li>
            ))}
          </ul>
        )}
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
          {c.offers ? "Agreed to offers on WhatsApp" : "Did not ask for offers"} · {c.chances_used} of {CLAIM_CHANCES} {CLAIM_CHANCES === 1 ? "race" : "races"} played{c.chosen_chance ? ", score chosen" : c.locked ? ", score kept" : ""}
        </p>
        {c.status === "used" && (
          <p className="flex items-start gap-2 text-navy bg-gray-50 rounded-lg p-3 mt-1">
            <Receipt size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <span>
              Used on bill <b>{c.bill_no}</b>: AED {formatPrice(c.bill_amount ?? 0)}, discount AED {formatPrice(c.discount_amount ?? 0)}
              <span className="block font-semibold">
                Paid AED {formatPrice(Math.max(Math.round(((c.bill_amount ?? 0) - (c.discount_amount ?? 0)) * 100) / 100, 0))}
              </span>
              {c.used_at && <span className="block text-[11px] text-gray-400">{when(c.used_at)}</span>}
            </span>
          </p>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-auto pt-2">
          <Clock size={11} /> Played {when(c.created_at)} · {c.status === "expired" ? "expired" : `valid until ${when(c.expires_at)}`}
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
          {/* What the customer pays once the discount is taken off, shown while the bill is typed */}
          {bill > 0 && (
            <div aria-live="polite" className="rounded-lg border border-green-100 bg-green-50/60 px-3 py-2.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Bill</span>
                <span>AED {formatPrice(bill)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Discount ({formatPercent(c.percent)}%)</span>
                <span>− AED {formatPrice(discount)}</span>
              </div>
              <div className="flex justify-between items-baseline border-t border-green-100 mt-1.5 pt-1.5 text-navy">
                <span className="text-[11px] font-bold uppercase tracking-wider">Customer pays</span>
                <span className="text-xl font-bold">AED {formatPrice(toPay)}</span>
              </div>
            </div>
          )}
          <button type="submit" disabled={saving || !billNo.trim() || !(bill > 0)} className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
            <Check size={15} /> {bill > 0 ? `Apply ${formatPercent(c.percent)}%: AED ${formatPrice(discount)} off` : `Apply ${formatPercent(c.percent)}% to bill`}
          </button>
        </form>
      )}
    </article>
  );
}
