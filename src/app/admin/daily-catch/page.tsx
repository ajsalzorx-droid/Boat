"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { saveDailyCatch, deleteDailyCatch, setDailyCatchAvailability } from "../actions";
import { actionFailed, uploadAdminImage } from "../client-helpers";
import { Plus, Edit, Trash2, X, AlertCircle, Upload } from "lucide-react";

export default function AdminDailyCatchPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    origin: "",
    price: "",
    description: "",
    image_url: "",
    is_available: true
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("daily_catch").select("*").order("updated_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleOpenModal = (item: any = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        origin: item.origin,
        price: item.price.toString(),
        description: item.description || "",
        image_url: item.image_url || "",
        is_available: item.is_available
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "", origin: "", price: "", description: "", image_url: "", is_available: true
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

      const publicUrl = await uploadAdminImage("daily-catch", e.target.files[0]);
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
      origin: formData.origin,
      price: parseFloat(formData.price),
      description: formData.description,
      image_url: formData.image_url,
      is_available: formData.is_available
    };

    // Token is verified on the server before the catch is saved
    if (actionFailed(await saveDailyCatch(editingId, payload))) return;

    setIsModalOpen(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this fresh catch?")) {
      if (actionFailed(await deleteDailyCatch(id))) return;
      fetchItems();
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    if (actionFailed(await setDailyCatchAvailability(id, !currentStatus))) return;
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-end md:flex-row md:justify-between md:items-center gap-3">
        <div className="min-w-0 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Daily Catch</h1>
          <p className="text-sm md:text-base text-gray-500">Manage the fresh catches of the day displayed on the homepage.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-ocean text-navy px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base rounded-lg font-bold flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0 hover:bg-ocean-light transition-colors"
        >
          <Plus size={18} className="w-4 h-4 md:w-[18px] md:h-[18px]" /> Add Fresh Catch
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-blue-800">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">These items appear in the "Today's Catch" section on the homepage. You can easily mark them as sold out instead of deleting them when they run out.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-md:overflow-x-auto admin-scroll">
        <table className="w-full max-md:min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500">
              <th className="p-4 w-16">Image</th>
              <th className="p-4">Name & Origin</th>
              <th className="p-4">Price</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading daily catch...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No fresh catch listed. Add one!</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className={`border-b border-gray-50 transition-colors ${!item.is_available ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50/50'}`}>
                  <td className="p-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">No img</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-navy">{item.name}</div>
                    <div className="text-xs text-ocean font-bold tracking-widest uppercase mt-0.5">{item.origin}</div>
                  </td>
                  <td className="p-4 text-navy font-bold">AED {item.price}</td>
                  <td className="p-4">
                    <button 
                      onClick={() => toggleAvailability(item.id, item.is_available)}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {item.is_available ? 'Available' : 'Sold Out'}
                    </button>
                  </td>
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto admin-scroll">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-navy">{editingId ? "Edit Catch" : "Add Fresh Catch"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fish/Seafood Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin (e.g., Local Waters) *</label>
                  <input required type="text" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (AED) *</label>
                <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ocean outline-none" />
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

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-navy text-white rounded-lg font-medium hover:bg-navy-light transition-colors">
                  {editingId ? "Save Changes" : "Add to Catch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
