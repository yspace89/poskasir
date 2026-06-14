import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { supabase } from '../db/supabaseClient';
import './Onboarding.css';

const STEPS = [
  { id: 1, title: 'Setup Toko', icon: '🏪' },
  { id: 2, title: 'Tambah Produk', icon: '📦' },
  { id: 3, title: 'Siap Berjualan!', icon: '🎉' },
];

export default function Onboarding({ user }) {
  const { refreshContext } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // We need to store the newly created org and store IDs to use in step 2
  const [createdOrg, setCreatedOrg] = useState(null);

  const [storeForm, setStoreForm] = useState({
    name: '', address: '', city: '', phone: '',
    receipt_footer: 'Terima kasih atas kunjungan Anda!'
  });
  
  const [productForm, setProductForm] = useState({
    name: '', sku: '', price: '', stock: ''
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleSetupStore = async () => {
    if (!storeForm.name || !user) return;
    setLoading(true);
    try {
      // Pastikan user ada di profiles, jika belum (akun lama), kita insert
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0]
        });
      }

      // Generate UUIDs di client untuk menghindari isu RLS (RETURNING clause)
      const orgId = crypto.randomUUID();
      const storeId = crypto.randomUUID();

      // 1. Buat Slug
      const slug = storeForm.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        + '-' + Date.now().toString(36);

      // 2. Buat Organization (Tanpa .select() agar tidak memicu error RLS SELECT policy)
      const { error: orgErr } = await supabase
        .from('organizations')
        .insert({ id: orgId, name: storeForm.name, slug, plan: 'free', owner_id: user.id });
      
      if (orgErr) throw orgErr;
      setCreatedOrg({ id: orgId, name: storeForm.name });

      // 3. Daftarkan sebagai owner di org_members (Wajib sebelum buat Store agar akses RLS terbuka)
      const { error: orgMemErr } = await supabase.from('org_members').insert({
        org_id: orgId, user_id: user.id, role: 'owner'
      });
      if (orgMemErr) throw orgMemErr;

      // 4. Buat Store (Sekarang RLS mengizinkan karena user sudah di org_members)
      const { error: storeErr } = await supabase
        .from('stores')
        .insert({
          id: storeId,
          org_id: orgId,
          name: storeForm.name,
          address: storeForm.address,
          city: storeForm.city,
          phone: storeForm.phone,
          receipt_footer: storeForm.receipt_footer
        });
      
      if (storeErr) throw storeErr;

      // 5. Daftarkan di store_members
      const { error: storeMemErr } = await supabase.from('store_members').insert({
        store_id: storeId, user_id: user.id, role: 'owner',
        can_view_reports: true, can_manage_products: true,
        can_void_transactions: true, can_manage_discounts: true, can_manage_team: true
      });
      if (storeMemErr) throw storeMemErr;

      // 6. Lanjut ke step berikutnya
      setStep(2);
    } catch (err) {
      console.error("Error creating store:", err);
      alert("Gagal membuat toko: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addFirstProduct = async () => {
    if (!createdOrg || !createdStore || !productForm.name) { setStep(3); return; }
    setLoading(true);
    try {
      await supabase.from('products').insert({
        org_id: createdOrg.id,
        store_id: createdStore.id,
        sku: productForm.sku || 'PRD-001',
        name: productForm.name,
        price: Number(productForm.price) || 0,
        stock: Number(productForm.stock) || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setStep(3);
    }
  };

  const finishOnboarding = async () => {
    await refreshContext();
    window.location.href = '/pos';
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card relative">
        {/* Logout Button for stuck users */}
        <button 
          onClick={handleLogout}
          className="absolute top-4 right-4 text-xs text-danger hover:underline cursor-pointer bg-transparent border-none"
        >
          Logout Akun Lama
        </button>

        {/* Progress */}
        <div className="onboarding-progress mt-6">
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
          <div className="onboarding-step animate-fade-in">
            <h2>Lengkapi Info Toko Anda</h2>
            <p className="text-muted text-sm">Mari kita atur toko pertama Anda. Info ini akan muncul di struk belanja pelanggan.</p>
            <div className="step-form">
              <div className="form-group">
                <label>Nama Toko *</label>
                <input className="input" required value={storeForm.name} placeholder="Misal: Yahya Mart"
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
            <button className="btn btn-primary w-full" onClick={handleSetupStore} disabled={loading || !storeForm.name}>
              {loading ? 'Menyimpan...' : 'Lanjut →'}
            </button>
          </div>
        )}

        {/* Step 2: Tambah produk pertama */}
        {step === 2 && (
          <div className="onboarding-step animate-fade-in">
            <h2>Tambah Produk Pertama</h2>
            <p className="text-muted text-sm">Mari tambahkan satu produk untuk dites. Bisa ditambah lebih banyak nanti di halaman Produk.</p>
            <div className="step-form">
              <div className="form-group">
                <label>Nama Produk *</label>
                <input className="input" placeholder="Misal: Aqua 600ml"
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
              <button className="btn btn-outline flex-1" onClick={() => setStep(3)} disabled={loading}>
                Lewati
              </button>
              <button className="btn btn-primary flex-1" onClick={addFirstProduct} disabled={loading || !productForm.name}>
                {loading ? 'Menyimpan...' : 'Tambah & Lanjut →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Selesai */}
        {step === 3 && (
          <div className="onboarding-step text-center animate-fade-in">
            <div className="success-emoji" style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2>Toko Siap!</h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Selamat! Toko <strong>{storeForm.name}</strong> sudah siap digunakan.
              Mulai terima transaksi sekarang!
            </p>
            <div className="quick-tips text-left p-4 bg-gray-50 rounded-xl mb-6">
              <div className="tip-item mb-2">📦 Kelola produk di menu <strong>Produk</strong></div>
              <div className="tip-item mb-2">👥 Undang kasir di menu <strong>Tim</strong></div>
              <div className="tip-item">📊 Lihat laporan di menu <strong>Laporan</strong></div>
            </div>
            <button className="btn btn-primary w-full py-3 text-lg" onClick={finishOnboarding}>
              Mulai Berjualan! →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
