import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { supabase } from '../db/supabaseClient';
import { Store, Plus, MapPin, Phone, Building2 } from 'lucide-react';

export default function StoreSettings() {
  const { org, store: activeStore, allStores, member, refreshContext, can, switchStore } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', city: '', phone: '' });

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Insert Store
      const { data: newStore, error: storeErr } = await supabase
        .from('stores')
        .insert({
          org_id: org.id,
          name: formData.name,
          address: formData.address,
          city: formData.city,
          phone: formData.phone
        })
        .select()
        .single();

      if (storeErr) throw storeErr;

      // 2. Insert Store Member (Owner/Creator)
      const { error: smErr } = await supabase
        .from('store_members')
        .insert({
          store_id: newStore.id,
          user_id: member.user_id,
          role: member.role, // e.g. owner
          can_view_reports: true,
          can_manage_products: true,
          can_void_transactions: true,
          can_manage_discounts: true,
          can_manage_team: true
        });

      if (smErr) throw smErr;

      setIsModalOpen(false);
      setFormData({ name: '', address: '', city: '', phone: '' });
      await refreshContext();
    } catch (err) {
      alert('Gagal membuat cabang: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!can('manage_store')) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">Anda tidak memiliki akses ke pengaturan cabang.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Cabang</h1>
          <p className="text-muted">Kelola outlet dan cabang toko untuk {org?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Tambah Cabang Baru
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allStores.map(s => (
            <div key={s.id} className={`bg-white border rounded-xl p-6 relative ${s.id === activeStore?.id ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
              {s.id === activeStore?.id && (
                <span className="absolute top-4 right-4 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-bold">
                  Aktif Saat Ini
                </span>
              )}
              <div className="w-12 h-12 bg-bg-main rounded-lg flex items-center justify-center mb-4 text-primary">
                <Store size={24} />
              </div>
              <h3 className="text-lg font-bold mb-1">{s.name}</h3>
              <p className="text-sm text-muted mb-4 flex items-start gap-1.5">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span>{s.address || 'Alamat belum diatur'}, {s.city || 'Kota belum diatur'}</span>
              </p>
              
              <div className="flex gap-2">
                {s.id !== activeStore?.id && (
                  <button className="btn btn-outline flex-1" onClick={() => switchStore(s.id)}>
                    Pindah ke Sini
                  </button>
                )}
                <button className="btn bg-bg-main hover:bg-border text-text-main flex-1">
                  Pengaturan
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Tambah Cabang Baru</h3>
              <p className="text-sm text-muted">Buat outlet baru di bawah organisasi {org?.name}</p>
            </div>
            <form onSubmit={handleCreateStore} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Nama Cabang / Outlet</label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input 
                    type="text" 
                    required 
                    className="input pl-10" 
                    placeholder="Contoh: Cabang Sudirman"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Alamat Lengkap</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-3 text-muted" />
                  <textarea 
                    className="input pl-10 py-2 h-20 resize-none" 
                    placeholder="Alamat toko..."
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Kota</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Jakarta"
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">No. Telepon</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                      type="text" 
                      className="input pl-10" 
                      placeholder="0812..."
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" className="btn btn-outline flex-1" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Buat Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
