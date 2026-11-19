"use client";

import { useState } from "react";
import { saveMenuItem, deleteMenuItem, type MenuItemRow } from "../actions";
import { actionFailed, confirmDialog, uploadAdminImage } from "../client-helpers";
import { Plus, Edit, Trash2, X, Upload } from "lucide-react";
import Pagination from "../Pagination";
import SearchBox from "../SearchBox";
import { toast } from "../Toaster";
import { useAdminList } from "../use-admin-list";

const PAGE_SIZE = 8;

export default function AdminMenuPage() {
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
    ingredients: "",
    is_tall: false,
    is_wide: false
  });

  const categories = [
    "Appetizers", "Soups & Salads", "Main Courses", 
    "Signature Dishes", "Sharing Platters", "Market Fresh", 
    "Desserts", "Beverages"
  ];

  // Server-side pages + debounced, abortable search (GET /api/admin/menu-items)
  const list = useAdminList<MenuItemRow>("/api/admin/menu-items", PAGE_SIZE);
  const { items, total: totalCount, page, loading, busy, goToPage, reload } = list;

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
        ingredients: item.ingredients ? item.ingredients.join(", ") : "",
        is_tall: item.is_tall || false,
        is_wide: item.is_wide || false
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "", category: "Main Courses", price: "", description: "", tag: "", image_url: "", dietary: "", ingredients: "", is_tall: false, is_wide: false
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
      toast(error.message, "error");
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
      ingredients: formData.ingredients.split(",").map(d => d.trim()).filter(d => d),
      is_tall: formData.is_tall,
      is_wide: formData.is_wide
    };

    // Token is verified on the server before the item is saved
    const res = await saveMenuItem(editingId, payload);
    if (actionFailed(res)) return;

    toast(editingId ? `"${payload.name}" updated` : `"${payload.name}" added to the menu`);
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
    const item = items.find((i) => i.id === id);
    const ok = await confirmDialog({
      title: "Delete this item?",
      text: `${item?.name ? `"${item.name}"` : "This item"} will be removed from the menu. This can't be undone.`,
      confirmText: "Yes, delete",
      danger: true,
    });
    if (ok) {
      if (actionFailed(await deleteMenuItem(id))) return;
      toast("Menu item deleted");
      // Deleting the last item on a page: step back a page
      if (items.length === 1 && page > 0) goToPage(page - 1);
      else reload();
    }
  };

  return (
    // Fills the admin area: only the table box scrolls, the heading stays put
    <div className="h-full min-h-0 flex flex-col gap-6">
      <div className="shrink-0 flex flex-col items-end md:flex-row md:justify-between md:items-center gap-3">
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

      <div className="shrink-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        <SearchBox
          value={list.search}
          onChange={list.setSearch}
          onEnter={list.searchNow}
          onClear={list.clearSearch}
          busy={busy && !loading}
          placeholder="Search by name, category, tag or ingredient"
          label="Search menu items"
        />
        {list.query && !loading && (
          <p className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? "item" : "items"} found
          </p>
        )}
      </div>

      {/* Items Table (dimmed while new results are on their way; the old rows stay until then) */}
      <div
        data-lenis-prevent
        aria-busy={busy}
        className={`flex-1 min-h-[240px] overflow-auto overscroll-contain bg-white rounded-xl shadow-sm border border-gray-100 admin-scroll transition-opacity duration-150 ${busy && !loading ? "opacity-60" : ""}`}
      >
        <table className="w-full max-md:min-w-[640px] text-left border-collapse">
          <thead className="sticky top-0 z-[1] bg-gray-50 shadow-[0_1px_0_#f3f4f6]">
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
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  {list.query ? `No menu items match "${list.query}".` : "No menu items found. Add one to get started."}
                </td>
              </tr>
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
      <div className="shrink-0">
        <Pagination page={page} pageSize={PAGE_SIZE} total={totalCount} onPage={goToPage} disabled={loading} label="Menu items pages" />
      </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients (comma separated)</label>
                <input type="text" value={formData.ingredients} onChange={e => setFormData({...formData, ingredients: e.target.value})} placeholder="Hammour, Lemon, Garlic, Olive Oil" className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
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
