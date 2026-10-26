"use client";

import { useState, useEffect } from "react";
import { saveOffer, deleteOffer, setOfferActive, listOffers, type OfferInput } from "../actions";
import { actionFailed, uploadAdminImage } from "../client-helpers";
import { Plus, Edit, Trash2, X, AlertCircle, Search, Upload, Monitor, Smartphone } from "lucide-react";
import { MENU_CATEGORIES } from "@/data/menu";
import { MAX_OFFER_PERCENT, offerStatus, toDubaiDay, type Offer, type OfferScope } from "@/lib/offers";

type Dish = { id: string; name: string; category: string; price: number };

// Width and height of a picked image file (null if the browser can't read it)
function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

const EMPTY_FORM = {
  title: "",
  description: "",
  percent: "",
  banner_url: "",
  banner_mobile_url: "",
  scope: "items" as OfferScope,
  categories: [] as string[],
  item_ids: [] as string[],
  start_day: "",
  end_day: "",
  is_active: true,
};

const STATUS_STYLE = {
  live: { label: "Live", className: "bg-green-100 text-green-700" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  ended: { label: "Ended", className: "bg-gray-200 text-gray-600" },
  off: { label: "Off", className: "bg-red-100 text-red-700" },
};

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [uploading, setUploading] = useState<"banner_url" | "banner_mobile_url" | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dishSearch, setDishSearch] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Bumped to refetch after add/edit/delete
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listOffers().then((res) => {
      if (cancelled) return;
      if (!actionFailed(res) && res.ok) {
        setOffers(res.data!.offers);
        setDishes(res.data!.dishes);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const fetchOffers = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const handleOpenModal = (offer: Offer | null = null) => {
    if (offer) {
      setEditingId(offer.id);
      setFormData({
        title: offer.title,
        description: offer.description || "",
        percent: String(offer.percent),
        banner_url: offer.banner_url ?? "",
        banner_mobile_url: offer.banner_mobile_url ?? "",
        scope: offer.scope,
        categories: offer.categories ?? [],
        item_ids: offer.item_ids ?? [],
        start_day: toDubaiDay(offer.starts_at),
        end_day: toDubaiDay(offer.ends_at),
        is_active: offer.is_active,
      });
    } else {
      setEditingId(null);
      setFormData(EMPTY_FORM);
    }
    setDishSearch("");
    setIsModalOpen(true);
  };

  // Banner images go straight to Cloudinary; the URL is saved with the offer
  const handleBannerUpload = async (field: "banner_url" | "banner_mobile_url", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same file can be picked again
    if (!file) return;

    // The site picks the banner by screen shape, so each slot needs its own shape (square fits both)
    const size = await imageSize(file);
    if (size && field === "banner_url" && size.height > size.width) {
      alert(`This image is tall (${size.width} × ${size.height}), a phone banner.\n\nUpload it in the Phone slot. The Desktop & tablet banner must be wide, like 1920 × 1080.`);
      return;
    }
    if (size && field === "banner_mobile_url" && size.width > size.height) {
      alert(`This image is wide (${size.width} × ${size.height}), a desktop banner.\n\nUpload it in the Desktop & tablet slot. The Phone banner must be tall, like 1080 × 1920.`);
      return;
    }

    setUploading(field);
    const url = await uploadAdminImage("offers", file);
    if (url) setFormData((f) => ({ ...f, [field]: url }));
    setUploading(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: OfferInput = { ...formData, percent: Number(formData.percent) };

    // Token is verified on the server before the offer is saved
    if (actionFailed(await saveOffer(editingId, payload))) return;

    setIsModalOpen(false);
    fetchOffers();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this offer?")) {
      if (actionFailed(await deleteOffer(id))) return;
      fetchOffers();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    if (actionFailed(await setOfferActive(id, !isActive))) return;
    fetchOffers();
  };

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const appliesTo = (offer: Offer) => {
    if (offer.scope === "all") return "Whole menu";
    if (offer.scope === "categories") return offer.categories.join(", ");
    const names = offer.item_ids.map((id) => dishes.find((d) => d.id === id)?.name).filter(Boolean);
    return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  };

  const dateRange = (offer: Offer) => {
    const from = toDubaiDay(offer.starts_at);
    const to = toDubaiDay(offer.ends_at);
    if (!from && !to) return "Always";
    return `${from || "Now"} → ${to || "No end"}`;
  };

  const percent = Number(formData.percent);
  const shownDishes = dishes.filter((d) => {
    const q = dishSearch.trim().toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
  });

  // "Select all" works on the dishes shown (all, or the search results); dishes chosen outside
  // the search stay chosen
  const allShownChosen = shownDishes.length > 0 && shownDishes.every((d) => formData.item_ids.includes(d.id));
  const toggleAllShown = () => {
    const shownIds = shownDishes.map((d) => d.id);
    setFormData({
      ...formData,
      item_ids: allShownChosen
        ? formData.item_ids.filter((id) => !shownIds.includes(id))
        : [...new Set([...formData.item_ids, ...shownIds])],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-end md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Offers</h1>
          <p className="text-sm md:text-base text-gray-500">Give a percentage off dishes, categories or the whole menu.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-ocean text-navy px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base rounded-lg font-bold flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0 hover:bg-ocean-light transition-colors"
        >
          <Plus size={18} className="w-4 h-4 md:w-[18px] md:h-[18px]" /> Add Offer
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-blue-800">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">Live offers are highlighted on the menu with the new price. Offers with a banner are shown in an offers section at the top of the homepage, above the hero (several slide by as a carousel). If a dish has two offers, the bigger discount is used.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-md:overflow-x-auto admin-scroll">
        <table className="w-full max-md:min-w-[720px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500">
              <th className="p-4">Offer & Banner</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Applies to</th>
              <th className="p-4">Dates</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading offers...</td></tr>
            ) : offers.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No offers yet. Add one!</td></tr>
            ) : (
              offers.map((offer) => {
                const status = STATUS_STYLE[offerStatus(offer)];
                return (
                  <tr key={offer.id} className={`border-b border-gray-50 transition-colors ${!offer.is_active ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50/50'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {offer.banner_url || offer.banner_mobile_url ? (
                          <img src={offer.banner_url || offer.banner_mobile_url} alt="" title="Homepage banner" className="w-16 h-9 object-cover rounded shadow-sm shrink-0" />
                        ) : (
                          <div title="No homepage banner" className="w-16 h-9 bg-offer/10 text-offer rounded flex items-center justify-center text-xs font-bold shrink-0">%</div>
                        )}
                        <span className="font-medium text-navy">{offer.title}</span>
                      </div>
                    </td>
                    <td className="p-4"><span className="bg-offer text-white text-xs font-bold px-2.5 py-1 rounded-full">{offer.percent}% OFF</span></td>
                    <td className="p-4 text-gray-500 text-sm max-w-[220px]">{appliesTo(offer)}</td>
                    <td className="p-4 text-gray-500 text-sm whitespace-nowrap">{dateRange(offer)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleActive(offer.id, offer.is_active)}
                        title={offer.is_active ? "Click to switch off" : "Click to switch on"}
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${status.className}`}
                      >
                        {status.label}
                      </button>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => handleOpenModal(offer)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(offer.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto admin-scroll">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-navy">{editingId ? "Edit Offer" : "Add Offer"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Title * (e.g., Weekend Lobster Deal)</label>
                  <input required type="text" maxLength={80} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%) *</label>
                  <div className="relative">
                    <input required type="number" min={1} max={MAX_OFFER_PERCENT} step={1} value={formData.percent} onChange={e => setFormData({...formData, percent: e.target.value})} className="w-full border border-gray-200 rounded-lg pl-4 pr-9 py-2 focus:ring-2 focus:ring-ocean outline-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (only shown here, for staff)</label>
                <textarea rows={2} maxLength={300} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applies to *</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {([["items", "Selected dishes"], ["categories", "Categories"], ["all", "Whole menu"]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, scope: value })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.scope === value ? "bg-navy text-white border-navy" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {formData.scope === "categories" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    {MENU_CATEGORIES.map((c) => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.categories.includes(c)} onChange={() => setFormData({ ...formData, categories: toggleIn(formData.categories, c) })} className="w-4 h-4 text-ocean rounded border-gray-300" />
                        <span className="text-sm text-gray-700">{c}</span>
                      </label>
                    ))}
                  </div>
                )}

                {formData.scope === "items" && (
                  <div className="bg-gray-50 rounded-lg border border-gray-100">
                    <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                      <Search size={16} className="text-gray-400 shrink-0" />
                      <input type="text" value={dishSearch} onChange={e => setDishSearch(e.target.value)} placeholder="Search dishes" className="w-full bg-transparent text-sm outline-none" />
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formData.item_ids.length} chosen</span>
                    </div>
                    {shownDishes.length > 0 && (
                      <label className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 cursor-pointer hover:bg-white">
                        <input
                          type="checkbox"
                          checked={allShownChosen}
                          ref={(el) => {
                            if (el) el.indeterminate = !allShownChosen && shownDishes.some((d) => formData.item_ids.includes(d.id));
                          }}
                          onChange={toggleAllShown}
                          className="w-4 h-4 text-ocean rounded border-gray-300 shrink-0"
                        />
                        <span className="text-sm font-semibold text-navy">
                          Select all{dishSearch.trim() ? ` (${shownDishes.length} found)` : ` (${shownDishes.length})`}
                        </span>
                      </label>
                    )}
                    <div className="max-h-56 overflow-y-auto admin-scroll p-2">
                      {shownDishes.length === 0 ? (
                        <p className="p-3 text-sm text-gray-400 text-center">No dishes found.</p>
                      ) : (
                        shownDishes.map((d) => (
                          <label key={d.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white cursor-pointer">
                            <input type="checkbox" checked={formData.item_ids.includes(d.id)} onChange={() => setFormData({ ...formData, item_ids: toggleIn(formData.item_ids, d.id) })} className="w-4 h-4 text-ocean rounded border-gray-300 shrink-0" />
                            <span className="text-sm text-navy flex-1 min-w-0 truncate">{d.name}</span>
                            <span className="text-xs text-gray-400 hidden sm:inline">{d.category}</span>
                            <span className="text-xs font-bold text-navy whitespace-nowrap">
                              AED {d.price}
                              {percent > 0 && percent <= MAX_OFFER_PERCENT && formData.item_ids.includes(d.id) && (
                                <span className="text-offer"> → {Math.round(d.price * (100 - percent)) / 100}</span>
                              )}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {formData.scope === "all" && (
                  <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-100">Every dish on the menu gets this discount.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input type="date" value={formData.start_day} onChange={e => setFormData({...formData, start_day: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
                  <p className="text-xs text-gray-400 mt-1">Empty = starts now</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                  <input type="date" min={formData.start_day || undefined} value={formData.end_day} onChange={e => setFormData({...formData, end_day: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
                  <p className="text-xs text-gray-400 mt-1">Empty = until you switch it off</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Homepage Banner (optional)</label>
                <p className="text-xs text-gray-400 mb-3">
                  The designer&apos;s banner, shown as the background of the offers section at the top of the homepage. The site picks the one that fits the screen; add both for the best look. Without a banner the offer only shows on the menu.
                </p>
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  {([
                    ["banner_url", "Desktop & tablet", "Wide, 1920 × 1080. Shown on desktops and sideways tablets", Monitor, "w-24 aspect-video"],
                    ["banner_mobile_url", "Phone", "Tall, 1080 × 1920. Shown on phones and upright tablets", Smartphone, "w-10 aspect-[9/16]"],
                  ] as const).map(([field, label, hint, Icon, previewClass]) => (
                    <div key={field} className="flex items-center gap-3">
                      {formData[field] ? (
                        <img src={formData[field]} alt="" className={`object-cover rounded border border-gray-200 bg-white shrink-0 ${previewClass}`} />
                      ) : (
                        <div className={`rounded border border-dashed border-gray-300 bg-white text-gray-300 flex items-center justify-center shrink-0 ${previewClass}`}>
                          <Icon size={16} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">{label}</p>
                        <p className="text-xs text-gray-400">{hint}</p>
                      </div>
                      <label className="cursor-pointer shrink-0 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                        <input type="file" accept="image/*" onChange={(e) => handleBannerUpload(field, e)} disabled={uploading !== null} className="hidden" />
                        {uploading === field ? (
                          <span className="flex items-center gap-2 text-ocean">
                            <span className="w-4 h-4 border-2 border-ocean border-t-transparent rounded-full animate-spin"></span>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Upload size={14} /> {formData[field] ? "Change" : "Upload"}
                          </span>
                        )}
                      </label>
                      {formData[field] && (
                        <button type="button" onClick={() => setFormData({ ...formData, [field]: "" })} className="text-sm text-red-500 hover:underline shrink-0">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-100">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-ocean rounded border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Offer is on</span>
              </label>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={uploading !== null} className="px-5 py-2 bg-navy text-white rounded-lg font-medium hover:bg-navy-light transition-colors disabled:opacity-50">
                  {editingId ? "Save Changes" : "Add Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
