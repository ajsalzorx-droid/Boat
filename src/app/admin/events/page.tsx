"use client";

import { useEffect, useState } from "react";
import { deleteEvent, listEvents, saveEvent, setEventActive } from "../actions";
import { actionFailed, confirmDialog, uploadAdminImage } from "../client-helpers";
import { toast } from "../Toaster";
import { AlertCircle, ChevronLeft, ChevronRight, Edit, ExternalLink, ImagePlus, Plus, Trash2, Upload, X } from "lucide-react";
import { slugify } from "@/lib/blog";
import { EVENT_LIMITS, eventDateText, eventPath, type EventPhoto, type SiteEvent, type SiteEventInput } from "@/lib/events";

const EMPTY_FORM: SiteEventInput = {
  title: "",
  slug: "",
  tag: "",
  event_date: "",
  description: "",
  body: "",
  seo_title: "",
  cover_image: "",
  cover_alt: "",
  photos: [],
  is_active: true,
};

const INPUT = "w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none";
const LABEL = "block text-sm font-medium text-gray-700 mb-1";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SiteEventInput>(EMPTY_FORM);
  // New events: the web address follows the name until it is typed by hand
  const [slugTyped, setSlugTyped] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "photos" | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [saving, setSaving] = useState(false);

  // Bumped to refetch after add/edit/delete
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listEvents().then((res) => {
      if (cancelled) return;
      if (!actionFailed(res) && res.ok) setEvents(res.data!);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const openModal = (event: SiteEvent | null = null) => {
    if (event) {
      setEditingId(event.id);
      setForm({
        title: event.title,
        slug: event.slug,
        tag: event.tag,
        event_date: event.event_date,
        description: event.description,
        body: event.body,
        seo_title: event.seo_title,
        cover_image: event.cover_image,
        cover_alt: event.cover_alt,
        photos: event.photos,
        is_active: event.is_active,
      });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setSlugTyped(!!event);
    setIsModalOpen(true);
  };

  const set = <K extends keyof SiteEventInput>(key: K, value: SiteEventInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setPhotos = (change: (photos: EventPhoto[]) => EventPhoto[]) => setForm((f) => ({ ...f, photos: change(f.photos) }));

  const movePhoto = (from: number, to: number) =>
    setPhotos((photos) => {
      if (to < 0 || to >= photos.length) return photos;
      const next = [...photos];
      const [photo] = next.splice(from, 1);
      next.splice(to, 0, photo);
      return next;
    });

  // Photos go straight to Cloudinary; their URLs are saved with the event
  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same file can be picked again
    if (!file) return;
    setUploading("cover");
    const url = await uploadAdminImage("events", file);
    if (url) set("cover_image", url);
    setUploading(null);
  };

  const uploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const room = EVENT_LIMITS.photos - form.photos.length;
    if (picked.length > room) toast(`An event can have at most ${EVENT_LIMITS.photos} photos. Only the first ${room} are added.`, "error");
    const files = picked.slice(0, room);
    if (!files.length) return;
    setUploading("photos");
    setProgress({ done: 0, total: files.length });
    // One after the other, so the photos keep the order they were picked in
    for (const [i, file] of files.entries()) {
      const url = await uploadAdminImage("events", file);
      if (url) setPhotos((photos) => [...photos, { src: url, alt: "" }]);
      setProgress({ done: i + 1, total: files.length });
    }
    setUploading(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.cover_image) {
      toast("Add a cover photo.", "error");
      return;
    }
    setSaving(true);
    const res = await saveEvent(editingId, { ...form, slug: form.slug.replace(/^-+|-+$/g, "") });
    setSaving(false);
    if (actionFailed(res)) return;
    toast(editingId ? `"${form.title}" updated` : `"${form.title}" added`);
    setIsModalOpen(false);
    reload();
  };

  const handleDelete = async (event: SiteEvent) => {
    const ok = await confirmDialog({
      title: "Delete this event?",
      text: `"${event.title}" and its page will be removed from the website. This can't be undone.\n\nTo only hide it, click its status instead.`,
      confirmText: "Yes, delete",
      danger: true,
    });
    if (!ok || actionFailed(await deleteEvent(event.id))) return;
    toast("Event deleted");
    reload();
  };

  const toggleActive = async (event: SiteEvent) => {
    if (actionFailed(await setEventActive(event.id, !event.is_active))) return;
    toast(event.is_active ? "Event hidden" : "Event is on the website");
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-end md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Events</h1>
          <p className="text-sm md:text-base text-gray-500">Add events with their story and photos.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-ocean text-navy px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base rounded-lg font-bold flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0 hover:bg-ocean-light transition-colors"
        >
          <Plus size={18} className="w-4 h-4 md:w-[18px] md:h-[18px]" /> Add Event
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-blue-800">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">
          Events show on the Events page, newest first. A click on an event opens its own page with the story and all its photos. Changes are live as soon as you save.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-md:overflow-x-auto admin-scroll">
        <table className="w-full max-md:min-w-[680px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500">
              <th className="p-4">Event</th>
              <th className="p-4">Date</th>
              <th className="p-4">Photos</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading events...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No events yet. Add one!</td></tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className={`border-b border-gray-50 transition-colors ${!event.is_active ? "bg-gray-50/50 opacity-60" : "hover:bg-gray-50/50"}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.cover_image} alt="" className="w-12 h-16 object-cover rounded shadow-sm shrink-0 bg-gray-100" />
                      <div className="min-w-0">
                        <p className="font-medium text-navy">{event.title}</p>
                        <p className="text-xs text-gray-400 break-all">{eventPath(event.slug)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500 text-sm whitespace-nowrap">{eventDateText(event.event_date) || "—"}</td>
                  <td className="p-4 text-gray-500 text-sm">{event.photos.length}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(event)}
                      title={event.is_active ? "Click to hide" : "Click to show on the website"}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${event.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {event.is_active ? "Live" : "Hidden"}
                    </button>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    {event.is_active && (
                      <a href={eventPath(event.slug)} target="_blank" rel="noopener" aria-label={`View ${event.title} on the website`} className="inline-block p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors mr-2">
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button onClick={() => openModal(event)} aria-label={`Edit ${event.title}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(event)} aria-label={`Delete ${event.title}`} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div role="dialog" aria-modal="true" aria-label={editingId ? "Edit Event" : "Add Event"} className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[94dvh] overflow-y-auto overscroll-contain admin-scroll">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-navy">{editingId ? "Edit Event" : "Add Event"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={uploading !== null || saving} aria-label="Close" className="text-gray-400 hover:text-gray-600 disabled:opacity-40">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
              <div>
                <label htmlFor="ev-title" className={LABEL}>Event Name *</label>
                <input
                  id="ev-title"
                  required
                  type="text"
                  maxLength={EVENT_LIMITS.title}
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({ ...f, title, ...(!slugTyped && { slug: slugify(title) }) }));
                  }}
                  className={INPUT}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ev-date" className={LABEL}>Date</label>
                  <input id="ev-date" type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} className={INPUT} />
                  <p className="text-xs text-gray-400 mt-1">Empty = no date is shown</p>
                </div>
                <div>
                  <label htmlFor="ev-tag" className={LABEL}>Badge</label>
                  <input id="ev-tag" type="text" maxLength={EVENT_LIMITS.tag} value={form.tag} onChange={(e) => set("tag", e.target.value)} placeholder="e.g. Kids" className={INPUT} />
                  <p className="text-xs text-gray-400 mt-1">Small label on the cover photo</p>
                </div>
              </div>

              <div>
                <label htmlFor="ev-description" className={LABEL}>Short Summary *</label>
                <textarea id="ev-description" required rows={2} maxLength={EVENT_LIMITS.description} value={form.description} onChange={(e) => set("description", e.target.value)} className={INPUT}></textarea>
                <p className="text-xs text-gray-400 mt-1">
                  Shown on the card, on Google and when the page is shared. {form.description.length} characters (best: 70–160).
                </p>
              </div>

              <div>
                <label htmlFor="ev-body" className={LABEL}>Content</label>
                <textarea id="ev-body" rows={6} maxLength={EVENT_LIMITS.body} value={form.body} onChange={(e) => set("body", e.target.value)} className={INPUT}></textarea>
                <p className="text-xs text-gray-400 mt-1">The story on the event&apos;s page. Leave an empty line to start a new paragraph.</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Cover Photo *</p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {form.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.cover_image} alt="" className="w-24 aspect-[3/4] object-cover rounded border border-gray-200 bg-white shrink-0" />
                  ) : (
                    <div className="w-24 aspect-[3/4] rounded border border-dashed border-gray-300 bg-white text-gray-300 flex items-center justify-center shrink-0">
                      <ImagePlus size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 w-full space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors focus-within:ring-2 focus-within:ring-ocean">
                        <input type="file" accept="image/*" onChange={uploadCover} disabled={uploading !== null} className="sr-only" />
                        <span className="flex items-center gap-2">
                          <Upload size={14} /> {uploading === "cover" ? "Uploading..." : form.cover_image ? "Change" : "Upload"}
                        </span>
                      </label>
                      <span className="text-xs text-gray-400">Tall photo, 1080 × 1440, up to 10 MB</span>
                    </div>
                    <input
                      type="text"
                      aria-label="Cover photo description"
                      maxLength={EVENT_LIMITS.alt}
                      value={form.cover_alt}
                      onChange={(e) => set("cover_alt", e.target.value)}
                      placeholder="Describe the photo (for Google)"
                      className={`${INPUT} text-sm bg-white`}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Photos ({form.photos.length})</p>
                    <p className="text-xs text-gray-400">Shown on the event&apos;s page in this order. Pick several at once, up to 10 MB each.</p>
                  </div>
                  <label className="cursor-pointer border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors focus-within:ring-2 focus-within:ring-ocean">
                    <input type="file" accept="image/*" multiple onChange={uploadPhotos} disabled={uploading !== null || form.photos.length >= EVENT_LIMITS.photos} className="sr-only" />
                    <span className="flex items-center gap-2">
                      <ImagePlus size={14} /> {uploading === "photos" ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}...` : "Add photos"}
                    </span>
                  </label>
                </div>
                {form.photos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No photos yet.</p>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {form.photos.map((photo, i) => (
                      <li key={`${photo.src}-${i}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.src} alt="" loading="lazy" className="w-full aspect-[3/4] object-cover bg-gray-100" />
                        <div className="flex items-center justify-between px-1">
                          <button type="button" onClick={() => movePhoto(i, i - 1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="p-2 text-gray-500 hover:text-navy disabled:opacity-25">
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-xs text-gray-400">{i + 1}</span>
                          <button type="button" onClick={() => movePhoto(i, i + 1)} disabled={i === form.photos.length - 1} aria-label={`Move photo ${i + 1} later`} className="p-2 text-gray-500 hover:text-navy disabled:opacity-25">
                            <ChevronRight size={16} />
                          </button>
                          <button type="button" onClick={() => setPhotos((photos) => photos.filter((_, n) => n !== i))} aria-label={`Remove photo ${i + 1}`} className="p-2 text-red-500 hover:text-red-700">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <input
                          type="text"
                          aria-label={`Photo ${i + 1} description`}
                          maxLength={EVENT_LIMITS.alt}
                          value={photo.alt}
                          onChange={(e) => {
                            const alt = e.target.value;
                            setPhotos((photos) => photos.map((p, n) => (n === i ? { ...p, alt } : p)));
                          }}
                          placeholder="Describe (optional)"
                          className="w-full border-t border-gray-100 px-2 py-2 text-xs outline-none focus:bg-blue-50"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ev-slug" className={LABEL}>Web Address *</label>
                  <input
                    id="ev-slug"
                    required
                    type="text"
                    maxLength={EVENT_LIMITS.slug}
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTyped(true);
                      // Dashes stay while typing ("boat-"); the ends are trimmed when saving
                      set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }}
                    className={INPUT}
                  />
                  <p className="text-xs text-gray-400 mt-1 break-all">boatseafood.com{eventPath(form.slug || "event-name")}</p>
                </div>
                <div>
                  <label htmlFor="ev-seo-title" className={LABEL}>Google Title</label>
                  <input id="ev-seo-title" type="text" maxLength={EVENT_LIMITS.seo_title} value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} placeholder={form.title ? `${form.title} | Boat Seafood Dubai` : ""} className={INPUT} />
                  <p className="text-xs text-gray-400 mt-1">Empty = the event name (best: under 60 characters)</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-100">
                <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 text-ocean rounded border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Show on website</span>
              </label>

              <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={uploading !== null || saving} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={uploading !== null || saving} className="px-5 py-2 bg-navy text-white rounded-lg font-medium hover:bg-navy-light transition-colors disabled:opacity-50">
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
