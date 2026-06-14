import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { supabase } from '../db/supabaseClient';
import './Onboarding.css';

const STEPS = [
  { id: 1, title: 'Setup Toko', icon: '🏪' },
  { id: 2, title: 'Tambah Produk', icon: '📦' },
  { id: 3, title: 'Siap Berjualan!', icon: '🎉' },
];

export default function Onboarding() {
  const { store, org, refreshContext } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: store?.name || '', address: '', city: '', phone: '',
    receipt_footer: 'Terima kasih atas kunjungan Anda!'
  });
  const [productForm, setProductForm] = useState({
    name: '', sku: '', price: '', stock: ''
  });

  const updateStore = async () => {
    if (!store) return;
    setLoading(true);
    await supabase.from('stores').update(storeForm).eq('id', store.id);
    setLoading(false);
    setStep(2);
  };

  const addFirstProduct = async () => {
    if (!org || !productForm.name) { setStep(3); return; }
    setLoading(true);
    await supabase.from('products').insert({
      org_id: org.id,
      store_id: null,
      sku: productForm.sku || 'PRD-001',
      name: productForm.name,
      price: Number(productForm.price) || 0,
      stock: Number(productForm.stock) || 0,
    });
    setLoading(false);
    setStep(3);
  };

  const finishOnboarding = async () => {
    await refreshContext();
    window.location.href = '/pos';
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {/* Progress */}
        <div className="onboarding-progress">
          {STEPS.map((s, i) => (
            <div key={s.id} className="progress-item">
              <div className={`progress-circle ${step >= s.id ? 'done' : ''} ${step === s.id ? 'active' : ''}`}>
                {step > s.id ? '✓' : s.icon}
              </div>
              <span className={`progress-label ${step === s.id ? 'active' : ''}`}>{s.title}</span>
              {i < STEPS.length - 1 && <div className={`progress-connector ${step > s.id ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Setup toko */}
        {step === 1 && (
          <div className="onboarding-step">
            <h2>Lengkapi Info Toko Anda</h2>
            <p className="text-muted text-sm">Info ini akan muncul di struk belanja pelanggan.</p>
            <div className="step-form">
              <div className="form-group">
                <label>Nama Toko *</label>
                <input className="input" required value={storeForm.name}
                  onChange={e => setStoreForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Alamat</label>
                <input className="input" placeholder="Jl. Merdeka No. 1"
                  value={storeForm.address}
                  onChange={e => setStoreForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Kota</label>
                  <input className="input" placeholder="Jakarta"
                    value={storeForm.city}
                    onChange={e => setStoreForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Telepon</label>
                  <input className="input" placeholder="0812..."
                    value={storeForm.phone}
                    onChange={e => setStoreForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Pesan di Struk</label>
                <input className="input" value={storeForm.receipt_footer}
                  onChange={e => setStoreForm(p => ({ ...p, receipt_footer: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary w-full" onClick={updateStore} disabled={loading || !storeForm.name}>
              {loading ? 'Menyimpan...' : 'Lanjut →'}
            </button>
          </div>
        )}

        {/* Step 2: Tambah produk pertama */}
        {step === 2 && (
          <div className="onboarding-step">
            <h2>Tambah Produk Pertama</h2>
            <p className="text-muted text-sm">Bisa ditambah lebih banyak nanti di halaman Produk.</p>
            <div className="step-form">
              <div className="form-group">
                <label>Nama Produk *</label>
                <input className="input" placeholder="Aqua 600ml"
                  value={productForm.name}
                  onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Harga (Rp)</label>
                  <input className="input" type="number" placeholder="5000"
                    value={productForm.price}
                    onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Stok Awal</label>
                  <input className="input" type="number" placeholder="100"
                    value={productForm.stock}
                    onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setStep(3)}>
                Lewati
              </button>
              <button className="btn btn-primary flex-1" onClick={addFirstProduct} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Tambah & Lanjut →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Selesai */}
        {step === 3 && (
          <div className="onboarding-step text-center">
            <div className="success-emoji">🎉</div>
            <h2>Toko Siap!</h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Selamat! Toko <strong>{storeForm.name}</strong> sudah siap digunakan.
              Mulai terima transaksi sekarang!
            </p>
            <div className="quick-tips">
              <div className="tip-item">📦 Kelola produk di menu <strong>Produk</strong></div>
              <div className="tip-item">👥 Undang kasir di menu <strong>Tim</strong></div>
              <div className="tip-item">📊 Lihat laporan di menu <strong>Laporan</strong></div>
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: '1.5rem' }} onClick={finishOnboarding}>
              Mulai Berjualan! →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
