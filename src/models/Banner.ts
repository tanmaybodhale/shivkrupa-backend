'use client';

import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Plus, Pencil, Trash2, Check, X, Image as ImageIcon, Loader2, Power, GripVertical } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Banner {
  _id: string;
  image: string;
  link?: string;
  title?: string;
  order: number;
  active: boolean;
}

export default function BannerManager({ showToast }: { showToast: (msg: string) => void }) {
  const { isDark } = useTheme();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLink, setEditLink] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editOrder, setEditOrder] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${API_URL}/banners?admin=true`);
      const data = await res.json();
      if (data.success) setBanners(data.banners);
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadNewBanner = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      showToast(`❌ Invalid file type: ${file.type}`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('❌ File too large. Maximum size is 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        showToast(`❌ Upload failed: ${uploadData.message}`);
        return;
      }

      const createRes = await fetch(`${API_URL}/banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadData.url, order: banners.length, active: true }),
      });
      const createData = await createRes.json();
      if (createData.success) {
        setBanners(prev => [...prev, createData.banner]);
        showToast('✅ Banner added! Set a link below if it should be clickable.');
      } else {
        showToast(`❌ ${createData.message || 'Failed to create banner'}`);
      }
    } catch (error: any) {
      showToast(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startEdit = (banner: Banner) => {
    setEditingId(banner._id);
    setEditLink(banner.link || '');
    setEditTitle(banner.title || '');
    setEditOrder(banner.order);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`${API_URL}/banners/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: editLink.trim(), title: editTitle.trim(), order: editOrder }),
      });
      const data = await res.json();
      if (data.success) {
        setBanners(prev => prev.map(b => b._id === editingId ? data.banner : b).sort((a, b) => a.order - b.order));
        showToast('✅ Banner updated!');
        cancelEdit();
      }
    } catch {
      showToast('❌ Failed to update banner');
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const res = await fetch(`${API_URL}/banners/${banner._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !banner.active }),
      });
      const data = await res.json();
      if (data.success) {
        setBanners(prev => prev.map(b => b._id === banner._id ? data.banner : b));
      }
    } catch {
      showToast('❌ Failed to update status');
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      const res = await fetch(`${API_URL}/banners/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBanners(prev => prev.filter(b => b._id !== id));
        showToast('✅ Banner deleted');
      }
    } catch {
      showToast('❌ Failed to delete banner');
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 rounded-3xl border shadow-sm ${isDark ? 'bg-[#1a1535] border-[#2d2450]' : 'bg-white border-orange-100'}`}>
        <div className={`w-8 h-8 border-4 rounded-full animate-spin mb-4 ${isDark ? 'border-indigo-900 border-t-indigo-500' : 'border-orange-200 border-t-orange-500'}`} />
        <p className="font-bold text-gray-500">Loading banners...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-[2rem] shadow-sm overflow-hidden border p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDark ? 'bg-[#1a1535] border-[#2d2450]' : 'bg-white border-orange-100/50'}`}>
        <div>
          <h3 className={`font-black text-xl ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Homepage Banner Slideshow</h3>
          <p className="text-sm font-medium text-gray-500 mt-0.5">
            Advances every 3 seconds. Tap a slide to pause/resume. Order controls sequence.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadNewBanner(f); }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-60 ${isDark ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gradient-to-r from-orange-500 to-yellow-500'}`}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
          {uploading ? 'Uploading…' : 'Add Banner'}
        </button>
      </div>

      {/* Banner list */}
      <div className="space-y-3">
        {banners.map(banner => (
          <div key={banner._id} className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1a1535] border-[#2d2450]' : 'bg-white border-orange-100'}`}>
            <div className="flex items-stretch">
              {/* Thumbnail */}
              <div className={`w-28 sm:w-40 shrink-0 ${isDark ? 'bg-[#13102a]' : 'bg-gray-50'}`}>
                <img src={banner.image} alt={banner.title || 'Banner'} className="w-full h-full object-cover" style={{ aspectRatio: '21/9' }} />
              </div>

              <div className="flex-1 p-4 min-w-0">
                {editingId === banner._id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="Title (optional, alt text)"
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none ${isDark ? 'bg-[#13102a] border-[#2d2450] text-gray-200' : 'bg-orange-50/30 border-orange-200 text-gray-800'}`}
                    />
                    <input
                      type="text"
                      value={editLink}
                      onChange={e => setEditLink(e.target.value)}
                      placeholder="Link on click, e.g. /category/xerox (leave blank for none)"
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none ${isDark ? 'bg-[#13102a] border-[#2d2450] text-gray-200' : 'bg-orange-50/30 border-orange-200 text-gray-800'}`}
                    />
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Order:</span>
                      <input
                        type="number"
                        value={editOrder}
                        onChange={e => setEditOrder(Number(e.target.value))}
                        className={`w-20 px-2 py-1.5 rounded-lg border text-sm font-bold outline-none ${isDark ? 'bg-[#13102a] border-[#2d2450] text-gray-200' : 'bg-white border-orange-200 text-gray-900'}`}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEdit} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white ${isDark ? 'bg-green-600' : 'bg-green-500'}`}>
                        <Check size={13} /> Save
                      </button>
                      <button onClick={cancelEdit} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs ${isDark ? 'text-gray-400 bg-[#13102a]' : 'text-gray-500 bg-gray-100'}`}>
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {banner.title || 'Untitled banner'}
                        </p>
                        <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {banner.link ? `Links to: ${banner.link}` : 'No link — image only'}
                        </p>
                        <p className={`text-[10px] mt-1 font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                          Order: {banner.order}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleActive(banner)}
                        title={banner.active ? 'Active — click to hide' : 'Hidden — click to show'}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${banner.active
                          ? (isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200')
                          : (isDark ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' : 'bg-gray-50 text-gray-500 border-gray-200')}`}
                      >
                        <Power size={11} />
                        {banner.active ? 'LIVE' : 'HIDDEN'}
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => startEdit(banner)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white' : 'text-orange-600 bg-orange-50 hover:bg-orange-500 hover:text-white'}`}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => deleteBanner(banner._id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white' : 'text-red-500 bg-red-50 hover:bg-red-500 hover:text-white'}`}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className={`p-12 text-center rounded-2xl border ${isDark ? 'bg-[#1a1535] border-[#2d2450]' : 'bg-white border-orange-100'}`}>
          <ImageIcon size={32} className="mx-auto text-orange-300 mb-3" />
          <h4 className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>No banners yet</h4>
          <p className="text-gray-500 text-sm mt-1">Click "Add Banner" to upload your first slide. Until then, the homepage shows its default welcome banner.</p>
        </div>
      )}
    </div>
  );
}
