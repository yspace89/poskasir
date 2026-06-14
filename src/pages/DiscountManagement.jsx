import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { Plus, Pencil, Trash2, Tag, Lock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import './DiscountManagement.css';

const EMPTY_FORM = {
  code: '', discount_type: 'percent', value: '',
  min_purchase: '0', is_active: true, valid_until: ''
};

export default function DiscountManagement() {
  const { store, org } = useStore();
  const { canUse } = usePlan();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const isPremium = canUse('discounts');

  useEffect(() => {
    if (store) loadDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const loadDiscounts = async () => {
    setLoading(true);
    const { data } = await supabase.from('discounts')
      .select('*').eq('store_id', store.id)
      .order('created_at', { ascending: false });
    setDiscounts(data || []);
    setLoading(false);
  };

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (d) => {
    setForm({
      code: d.code, discount_type: d.discount_type, value: String(d.value),
      min_purchase: String(d.min_purchase), is_active: d.is_active,
      valid_until: d.valid_until || ''
    });
    setEditId(d.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.value) return;
    setSaving(true);
    const payload = {
      store_id: store.id, org_id: org.id,
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      value: Number(form.value),
      min_purchase: Number(form.min_purchase) || 0,
      is_active: form.is_active,
      valid_until: form.valid_until || null,
    };
    if (editId) {
      await supabase.from('discounts').update(payload).eq('id', editId);
    } else {
      await supabase.from('discounts').insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    loadDiscounts();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await supabase.from('discounts').delete().eq('id', toDelete.id);
    setToDelete(null);
    loadDiscounts();
  };

  const toggleActive = async (d) => {
    await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id);
    loadDiscounts();
  };

  const fmtDiscount = (d) => d.discount_type === 'percent'
    ? `${d.value}%`
    : `Rp ${d.value.toLocaleString('id-ID')}`;

  if (!isPremium) {
    return (
      <div className="discount-page">
        <header className="page-header">
          <h1 className="text-2xl font-bold">Diskon & Promo</h1>
        </header>
        <div className="card premium-gate-full">
          <Lock size={40} className="text-muted" />
          <h2>Fitur Premium</h2>
          <p>Manajemen kode diskon dan promo hanya tersedia untuk pengguna Premium.</p>
          <a href="/settings" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            ⭐ Lihat Paket Premium
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="discount-page">
      <header className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Diskon & Promo</h1>
          <p className="text-sm text-muted">{discounts.length} kode promo terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Tambah Kode
        </button>
      </header>

      <div className="card table-container">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th><Tag size={14} style={{ display: 'inline' }} /> Kode</th>
              <th>Nilai</th>
              <th>Min. Belanja</th>
              <th>Berlaku s/d</th>
              <th>Status</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-6 text-muted">Memuat...</td></tr>
            ) : discounts.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-6 text-muted">Belum ada kode promo.</td></tr>
            ) : discounts.map(d => (
              <tr key={d.id}>
                <td><code className="discount-code">{d.code}</code></td>
                <td className="font-semibold">{fmtDiscount(d)}</td>
                <td>Rp {Number(d.min_purchase).toLocaleString('id-ID')}</td>
                <td>{d.valid_until ? new Date(d.valid_until).toLocaleDateString('id-ID') : '—'}</td>
                <td>
                  <button
                    className={`status-badge ${d.is_active ? 'completed' : 'voided'}`}
                    onClick={() => toggleActive(d)}
                    style={{ cursor: 'pointer' }}
                    title="Klik untuk toggle"
                  >
                    {d.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td className="text-right">
                  <div className="flex gap-2 justify-end">
                    <button className="btn-icon" onClick={() => openEdit(d)}><Pencil size={15} /></button>
                    <button className="btn-icon" onClick={() => setToDelete(d)}><Trash2 size={15} className="text-danger" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editId ? 'Edit Kode Diskon' : 'Tambah Kode Diskon'}</h2>
            <div className="form-group">
              <label>Kode Promo *</label>
              <input className="input" style={{ textTransform: 'uppercase' }} placeholder="HEMAT10"
                value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="grid grid-cols-2 gap-4" style={{ marginTop: '0.875rem' }}>
              <div className="form-group">
                <label>Jenis Diskon</label>
                <select className="input" value={form.discount_type}
                  onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))}>
                  <option value="percent">Persen (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nilai *</label>
                <input className="input" type="number" placeholder={form.discount_type === 'percent' ? '10' : '5000'}
                  value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Min. Belanja (Rp)</label>
                <input className="input" type="number" placeholder="50000"
                  value={form.min_purchase} onChange={e => setForm(p => ({ ...p, min_purchase: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Berlaku s/d</label>
                <input className="input" type="date"
                  value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} />
              </div>
            </div>
            <div className="form-group mt-3">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                Aktifkan kode ini sekarang
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.code || !form.value}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        title="Hapus Kode Diskon"
        message={`Hapus kode "${toDelete?.code}"? Aksi ini tidak bisa dibatalkan.`}
        type="danger"
        confirmText="Ya, Hapus"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
