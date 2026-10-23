"use client";

import { useState, useEffect } from "react";
import { saveMenuItem, deleteMenuItem, listMenuItems } from "../actions";
import { actionFailed, uploadAdminImage } from "../client-helpers";
import { Plus, Edit, Trash2, X, Upload, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 8;

// Page numbers to show, with "…" gaps once there are many pages (0-based pages)
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set([0, total - 1, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < total).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

export default function AdminMenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "Main Courses",
    price: "",
    description: "",
    tag: "",
    image_url: "",
    dietary: "",
    is_tall: false,
    is_wide: false
  });

  const categories = [
    "Appetizers", "Soups & Salads", "Main Courses", 
    "Signature Dishes", "Sharing Platters", "Market Fresh", 
    "Desserts", "Beverages"
  ];

  // Bumped to refetch the current page after add/edit/delete
  const [reloadKey, setReloadKey] = useState(0);

  // Server-side pagination: the server skips page * PAGE_SIZE rows and returns PAGE_SIZE
  useEffect(() => {
    let cancelled = false;

    listMenuItems(page, PAGE_SIZE).then((res) => {
      if (cancelled) return; // a newer page was requested meanwhile
      if (!res.ok) {
        actionFailed(res);
        setLoading(false);
        return;
      }
      const { items: rows, total } = res.data!;
      // The page no longer exists (e.g. items were deleted) - go back to the first page
      if (rows.length === 0 && total > 0 && page > 0) {
        setPage(0);
        return;
      }
      setItems(rows);
      setTotalCount(total);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  // Loading is set here (not inside the effect) so page changes show the loading row
  const goToPage = (p: number) => {
    setLoading(true);
    setPage(p);
  };

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const firstShown = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastShown = Math.min((page + 1) * PAGE_SIZE, totalCount);

  const handleOpenModal = (item: any = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price.toString(),
        description: item.description || "",
        tag: item.tag || "",
        image_url: item.image_url || "",
        dietary: item.dietary ? item.dietary.join(", ") : "",
        is_tall: item.is_tall || false,
        is_wide: item.is_wide || false
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "", category: "Main Courses", price: "", description: "", tag: "", image_url: "", dietary: "", is_tall: false, is_wide: false
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingImage(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const publicUrl = await uploadAdminImage("menu", e.target.files[0]);
      if (publicUrl) setFormData({ ...formData, image_url: publicUrl });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      description: formData.description,
      tag: formData.tag,
      image_url: formData.image_url,
      dietary: formData.dietary.split(",").map(d => d.trim()).filter(d => d),
      is_tall: formData.is_tall,
      is_wide: formData.is_wide
    };

    // Token is verified on the server before the item is saved
    const res = await saveMenuItem(editingId, payload);
    if (actionFailed(res)) return;

    if (editingId) {
      setIsModalOpen(false);
      reload();
    } else {
      setIsModalOpen(false);
      // Newest items are listed first, so show page 1
      if (page === 0) reload();
      else goToPage(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      if (actionFailed(await deleteMenuItem(id))) return;
      // Deleting the last item on a page: step back a page
      if (items.length === 1 && page > 0) goToPage(page - 1);
      else reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-end md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Menu Management</h1>
          <p className="text-sm md:text-base text-gray-500">Add, edit, or remove items from your restaurant menu.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-ocean text-navy px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base rounded-lg font-bold flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0 hover:bg-ocean-light transition-colors"
        >
          <Plus size={18} className="w-4 h-4 md:w-[18px] md:h-[18px]" /> Add New Item
        </button>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-md:overflow-x-auto admin-scroll">
        <table className="w-full max-md:min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500">
              <th className="p-4 w-16">Image</th>
              <th className="p-4">Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading menu items...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No menu items found. Add one to get started.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">No img</div>
                    )}
                  </td>
                  <td className="p-4 font-medium text-navy">{item.name}</td>
                  <td className="p-4 text-gray-500 text-sm">{item.category}</td>
                  <td className="p-4 text-navy font-bold">AED {item.price}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-navy">{firstShown}–{lastShown}</span> of{" "}
            <span className="font-semibold text-navy">{totalCount}</span> items
          </p>

          {totalPages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Menu items pages">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 0 || loading}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-navy hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    disabled={loading}
                    aria-current={p === page ? "page" : undefined}
                    className={`min-w-9 h-9 px-2 rounded-lg text-sm font-semibold transition-all ${
                      p === page
                        ? "bg-navy text-white shadow-sm"
                        : "text-navy hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-navy hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto admin-scroll">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-navy">{editingId ? "Edit Menu Item" : "Add New Item"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean focus:border-ocean outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (AED) *</label>
                  <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean focus:border-ocean outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tag (e.g., Signature)</label>
                  <input type="text" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Upload</label>
                <div className="flex items-center gap-4">
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  )}
                  <label className="flex-1 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      disabled={uploadingImage}
                      className="hidden" 
                    />
                    {uploadingImage ? (
                      <span className="text-sm text-ocean flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-ocean border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 flex items-center justify-center gap-2">
                        <Upload size={16} />
                        {formData.image_url ? 'Change Image' : 'Upload Image'}
                      </span>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Tags (comma separated)</label>
                <input type="text" value={formData.dietary} onChange={e => setFormData({...formData, dietary: e.target.value})} placeholder="Gluten-Free, Vegan, Spicy" className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
              </div>

              <div className="flex gap-6 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_tall} onChange={e => setFormData({...formData, is_tall: e.target.checked})} className="w-4 h-4 text-ocean rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Tall Image Layout</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_wide} onChange={e => setFormData({...formData, is_wide: e.target.checked})} className="w-4 h-4 text-ocean rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Wide Image Layout</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-navy text-white rounded-lg font-medium hover:bg-navy-light transition-colors">
                  {editingId ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
