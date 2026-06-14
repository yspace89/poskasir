import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { useStore } from '../context/StoreContext';
import { Save, Store, Receipt, Package, Star } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import './Settings.css';

const TABS = [
  { id: 'store', label: 'Info Toko', icon: Store },
  { id: 'receipt', label: 'Struk', icon: Receipt },
  { id: 'plan', label: 'Paket', icon: Star },
];

export default function Settings() {
  const { store, org, refreshContext } = useStore();
  const { plan, limits, isPremium } = usePlan();
  const [activeTab, setActiveTab] = useState('store');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', city: '', phone: '',
    receipt_header: '', receipt_footer: '', logo_url: ''
  });

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || '',
        address: store.address || '',
        city: store.city || '',
        phone: store.phone || '',
        receipt_header: store.receipt_header || '',
        receipt_footer: store.receipt_footer || 'Terima kasih atas kunjungan Anda!',
        logo_url: store.logo_url || '',
      });
    }
  }, [store]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    await supabase.from('stores').update(form).eq('id', store.id);
    await refreshContext();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <button
          className={`btn ${saved ? 'btn-accent' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={16} />
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Simpan'}
        </button>
      </header>

      {/* Tab Bar */}
      <div className="settings-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Info Toko */}
      {activeTab === 'store' && (
        <div className="card settings-section">
          <h2 className="settings-section-title">Informasi Toko</h2>
          <p className="text-sm text-muted mb-4">Data ini digunakan untuk identifikasi toko Anda di sistem.</p>
          <div className="settings-grid">
            <div className="form-group">
              <label>Nama Toko *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Kota</label>
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Jakarta" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Alamat Lengkap</label>
              <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Jl. Merdeka No. 1" />
            </div>
            <div className="form-group">
              <label>Nomor Telepon</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08123456789" />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Struk */}
      {activeTab === 'receipt' && (
        <div className="card settings-section">
          <h2 className="settings-section-title">Pengaturan Struk</h2>
          <p className="text-sm text-muted mb-4">Data ini yang akan muncul di struk belanja pelanggan.</p>
          <div className="settings-form">
            <div className="form-group">
              <label>Nama di Struk</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
              <span className="text-xs text-muted">Nama toko yang muncul di bagian atas struk</span>
            </div>
            <div className="form-group">
              <label>Alamat di Struk</label>
              <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Nomor Telepon di Struk</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Header Tambahan (opsional)</label>
              <input className="input" placeholder="Contoh: Buka 08.00–22.00 Setiap Hari"
                value={form.receipt_header} onChange={e => set('receipt_header', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Pesan Penutup Struk</label>
              <input className="input" value={form.receipt_footer} onChange={e => set('receipt_footer', e.target.value)} />
            </div>
          </div>

          {/* Preview Struk */}
          <div className="receipt-preview">
            <h3 className="text-xs font-semibold text-muted mb-2">PREVIEW STRUK</h3>
            <div className="receipt-mock">
              <div className="text-center font-bold">{form.name || 'Nama Toko'}</div>
              {form.address && <div className="text-center text-xs">{form.address}</div>}
              {form.phone && <div className="text-center text-xs">Telp: {form.phone}</div>}
              {form.receipt_header && <div className="text-center text-xs">{form.receipt_header}</div>}
              <div className="receipt-divider">- - - - - - - - - - - - -</div>
              <div className="text-xs">Tgl: {new Date().toLocaleDateString('id-ID')}</div>
              <div className="text-xs">Kasir: Admin</div>
              <div className="receipt-divider">- - - - - - - - - - - - -</div>
              <div className="text-xs">Aqua 600ml  1x  3.500</div>
              <div className="receipt-divider">- - - - - - - - - - - - -</div>
              <div className="text-xs font-bold">TOTAL: Rp 3.500</div>
              <div className="receipt-divider">- - - - - - - - - - - - -</div>
              <div className="text-center text-xs">{form.receipt_footer}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Paket */}
      {activeTab === 'plan' && (
        <div className="settings-section">
          <div className={`plan-card ${isPremium ? 'premium' : 'free'}`}>
            <div className="plan-header">
              <div>
                <h2 className="plan-name">{isPremium ? '⭐ Premium' : '🆓 Free'}</h2>
                <p className="plan-desc">{isPremium ? 'Akses semua fitur tanpa batas' : 'Cocok untuk toko kecil yang baru mulai'}</p>
              </div>
              {!isPremium && (
                <div className="plan-price">
                  <span className="price-amount">Gratis</span>
                </div>
              )}
            </div>

            <div className="plan-limits">
              <h3>Batas Penggunaan</h3>
              <div className="limit-grid">
                <div className="limit-item">
                  <Package size={16} />
                  <span>Produk: <strong>{isPremium ? '∞ Unlimited' : `maks ${limits.products}`}</strong></span>
                </div>
                <div className="limit-item">
                  <Store size={16} />
                  <span>Outlet: <strong>{isPremium ? '∞ Unlimited' : `maks ${limits.outlets}`}</strong></span>
                </div>
              </div>
            </div>

            {!isPremium && (
              <div className="upgrade-section">
                <h3>Upgrade ke Premium</h3>
                <ul className="feature-list">
                  <li>✅ Unlimited produk, outlet, kasir</li>
                  <li>✅ Fitur Diskon & Kode Promo</li>
                  <li>✅ Export Laporan ke CSV</li>
                  <li>✅ Grafik penjualan visual</li>
                  <li>✅ Riwayat mutasi stok</li>
                  <li>✅ Multi-outlet management</li>
                  <li>✅ Priority support</li>
                </ul>
                <button className="btn btn-primary w-full" style={{ marginTop: '1rem' }}>
                  ⭐ Upgrade ke Premium — Hubungi Kami
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
