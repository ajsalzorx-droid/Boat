"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { listDeliveryApps, saveDeliveryApps } from "../actions";
import { actionFailed, confirmDialog } from "../client-helpers";
import { toast } from "../Toaster";
import { deliveryAppProblem, DELIVERY_LIMITS, type DeliveryApp } from "@/lib/delivery";

// Admin -> Delivery Apps: the apps in the website's "Delivery" menu (top right on a computer, in the
// phone menu). The whole list is saved at once, in the order shown here.

type Row = DeliveryApp & { key: number };
let nextKey = 1;
const withKeys = (apps: DeliveryApp[]): Row[] => apps.map((a) => ({ ...a, key: nextKey++ }));
const withoutKey = (r: Row): DeliveryApp => ({ name: r.name, url: r.url, color: r.color, visible: r.visible });

export default function AdminDeliveryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const plain = (list: Row[]) => JSON.stringify(list.map(withoutKey));
  const dirty = !loading && plain(rows) !== saved;

  useEffect(() => {
    listDeliveryApps().then((res) => {
      if (!actionFailed(res) && res.ok && res.data) {
        setRows(withKeys(res.data));
        setSaved(JSON.stringify(res.data));
      }
      setLoading(false);
    });
  }, []);

  // Leaving with unsaved changes asks first
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (key: number, change: Partial<DeliveryApp>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const move = (i: number, by: number) =>
    setRows((list) => {
      const next = [...list];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const add = () => setRows((list) => [...list, { key: nextKey++, name: "", url: "https://", color: "#669BBC", visible: true }]);
  const remove = async (row: Row) => {
    if (row.name && !(await confirmDialog({ title: `Remove ${row.name}?`, text: "It leaves the Delivery menu when you save.", confirmText: "Remove", danger: true }))) return;
    setRows((list) => list.filter((r) => r.key !== row.key));
  };

  const save = async () => {
    const apps = rows.map(withoutKey).map((a) => ({ ...a, name: a.name.trim(), url: a.url.trim() }));
    const problem = apps.map((a, i) => deliveryAppProblem(a, i + 1)).find(Boolean);
    if (problem) return toast(problem, "error");
    setSaving(true);
    const res = await saveDeliveryApps(apps);
    setSaving(false);
    if (actionFailed(res) || !res.ok) return;
    const fresh = res.data ?? apps;
    setRows(withKeys(fresh));
    setSaved(JSON.stringify(fresh));
    toast("Delivery apps saved. The website shows them now.");
  };

  const field = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-ocean/50";
  const iconButton = "p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-navy disabled:opacity-30 disabled:hover:bg-transparent";
  const shown = rows.filter((r) => r.visible);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-end md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Delivery Apps</h1>
          <p className="text-sm md:text-base text-gray-500">The apps in the website&rsquo;s Delivery menu.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={add}
            disabled={loading || rows.length >= DELIVERY_LIMITS.apps}
            className="border border-navy/20 text-navy px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base rounded-lg font-bold flex items-center gap-1.5 md:gap-2 whitespace-nowrap hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <Plus size={18} className="w-4 h-4 md:w-[18px] md:h-[18px]" /> Add App
          </button>
          <button
            onClick={save}
            disabled={loading || saving || !dirty}
            className="bg-ocean text-navy px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base rounded-lg font-bold flex items-center gap-1.5 md:gap-2 whitespace-nowrap hover:bg-ocean-light transition-colors disabled:opacity-50"
          >
            <Save size={18} className="w-4 h-4 md:w-[18px] md:h-[18px]" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-blue-800">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">
          Each app shows with its coloured dot, in this order, and opens its link in a new tab. Paste the link to the restaurant&rsquo;s own page on the app. Hidden apps stay here but are not shown. Changes go live when you press Save.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {loading ? (
          <p className="p-8 text-center text-gray-400">Loading delivery apps...</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-gray-400">No apps: the Delivery menu is hidden on the website. Add one!</p>
        ) : (
          rows.map((row, i) => (
            <div key={row.key} className={`p-4 flex flex-col gap-3 md:flex-row md:items-center ${row.visible ? "" : "bg-gray-50/70"}`}>
              <div className="flex items-center gap-3 md:contents">
                <label className="relative shrink-0 w-10 h-10 rounded-full border border-gray-200 cursor-pointer overflow-hidden" title="Dot colour">
                  <span className="absolute inset-0" style={{ background: row.color }} />
                  <input type="color" value={row.color} onChange={(e) => update(row.key, { color: e.target.value.toUpperCase() })} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={`${row.name || `App ${i + 1}`}: dot colour`} />
                </label>
                <input
                  value={row.name}
                  onChange={(e) => update(row.key, { name: e.target.value })}
                  maxLength={DELIVERY_LIMITS.name}
                  placeholder="Name, e.g. Talabat"
                  aria-label={`App ${i + 1}: name`}
                  className={`${field} md:w-48 md:shrink-0`}
                />
              </div>
              <div className="flex items-center gap-2 md:flex-1 min-w-0">
                <input
                  value={row.url}
                  onChange={(e) => update(row.key, { url: e.target.value })}
                  maxLength={DELIVERY_LIMITS.url}
                  placeholder="https://..."
                  inputMode="url"
                  aria-label={`${row.name || `App ${i + 1}`}: link`}
                  className={field}
                />
                <a
                  href={row.url.startsWith("https://") ? row.url : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${iconButton} shrink-0 ${row.url.startsWith("https://") ? "" : "pointer-events-none opacity-30"}`}
                  title="Open the link"
                  aria-label={`Open ${row.name || "the"} link`}
                >
                  <ExternalLink size={18} />
                </a>
              </div>
              <div className="flex items-center justify-between gap-1 md:justify-end md:shrink-0">
                <button
                  type="button"
                  onClick={() => update(row.key, { visible: !row.visible })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${row.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
                  title={row.visible ? "Shown on the website: click to hide" : "Hidden: click to show"}
                >
                  {row.visible ? <Eye size={14} /> : <EyeOff size={14} />} {row.visible ? "Shown" : "Hidden"}
                </button>
                <div className="flex items-center">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={iconButton} aria-label="Move up" title="Move up">
                    <ArrowUp size={18} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className={iconButton} aria-label="Move down" title="Move down">
                    <ArrowDown size={18} />
                  </button>
                  <button type="button" onClick={() => remove(row)} className={`${iconButton} hover:!text-red-600 hover:!bg-red-50`} aria-label={`Remove ${row.name || "this app"}`} title="Remove">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* How the menu will look */}
      {!loading && (
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-2">Preview</p>
          {shown.length ? (
            <div className="inline-flex flex-col bg-ink py-1.5 min-w-[180px] rounded shadow-xl">
              {shown.map((a) => (
                <span key={a.key} className="flex items-center gap-2.5 px-3 py-1.5 text-[10px] text-white/80 tracking-[2px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.color }} />
                  {a.name || "…"}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No app is shown: the website hides the Delivery menu.</p>
          )}
        </div>
      )}

      {dirty && <p className="text-sm font-semibold text-amber-700">You have unsaved changes.</p>}
    </div>
  );
}
