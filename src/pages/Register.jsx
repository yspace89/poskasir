import { useState } from 'react';
import { supabase } from '../db/supabaseClient';
import { Link } from 'react-router-dom';
import { WifiOff, Store } from 'lucide-react';
import '../pages/Login.css'; // Re-use the Split-Screen layout classes
import './Register.css'; // Specific register styles (like step indicator)

export default function Register() {
  const [step, setStep] = useState(1); // 1=akun, 2=toko
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    store_name: '', city: '', phone: ''
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleRegisterAccount = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Password dan konfirmasi tidak cocok.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } }
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    setStep(2);
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi tidak ditemukan. Coba login ulang.');

      // Buat slug dari nama toko
      const slug = form.store_name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        + '-' + Date.now().toString(36);

      // Buat Organization
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({ name: form.store_name, slug, plan: 'free', owner_id: user.id })
        .select().single();
      if (orgErr) throw orgErr;

      // Buat Store pertama
      const { data: store, error: storeErr } = await supabase
        .from('stores')
        .insert({
          org_id: org.id,
          name: form.store_name,
          city: form.city,
          phone: form.phone,
          receipt_footer: `Terima kasih telah berbelanja di ${form.store_name}!`
        })
        .select().single();
      if (storeErr) throw storeErr;

      // Daftarkan sebagai owner
      await supabase.from('org_members').insert({
        org_id: org.id, user_id: user.id, role: 'owner'
      });
      await supabase.from('store_members').insert({
        store_id: store.id, user_id: user.id, role: 'owner',
        can_view_reports: true, can_manage_products: true,
        can_void_transactions: true, can_manage_discounts: true, can_manage_team: true
      });

      // Redirect ke onboarding
      window.location.href = '/onboarding';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout">
      {/* Left Panel: Form */}
      <div className="split-left">
        <div className="login-form-container">
          <div className="brand-header mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">Kassa</h1>
            <h2 className="text-xl font-semibold text-text-main">
              {step === 1 ? 'Mulai Perjalanan Anda 🚀' : 'Langkah Terakhir 🏬'}
            </h2>
            <p className="text-sm text-muted mt-1">
              {step === 1 ? 'Daftar sekarang, kelola bisnis lebih pintar dan gratis.' : 'Siapkan cabang pertama Anda untuk mulai berjualan.'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="step-indicator mb-6">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`} />
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>

          {error && <div className="text-danger text-xs mb-4 bg-danger/10 p-3 rounded">{error}</div>}

          {step === 1 ? (
            <form onSubmit={handleRegisterAccount} className="flex-col gap-4">
              <div className="form-group floating-group">
                <input 
                  type="text" 
                  className="input floating-input" 
                  placeholder=" "
                  value={form.full_name} 
                  onChange={e => set('full_name', e.target.value)}
                  required 
                />
                <label className="floating-label">Nama Lengkap</label>
              </div>

              <div className="form-group floating-group">
                <input 
                  type="email" 
                  className="input floating-input" 
                  placeholder=" "
                  value={form.email} 
                  onChange={e => set('email', e.target.value)}
                  required 
                />
                <label className="floating-label">Alamat Email</label>
              </div>

              <div className="flex gap-3">
                <div className="form-group floating-group flex-1">
                  <input 
                    type="password" 
                    className="input floating-input" 
                    placeholder=" "
                    value={form.password} 
                    onChange={e => set('password', e.target.value)}
                    required 
                  />
                  <label className="floating-label">Password</label>
                </div>
                <div className="form-group floating-group flex-1">
                  <input 
                    type="password" 
                    className="input floating-input" 
                    placeholder=" "
                    value={form.confirm_password} 
                    onChange={e => set('confirm_password', e.target.value)}
                    required 
                  />
                  <label className="floating-label">Ulangi Password</label>
                </div>
              </div>

              <button className="btn btn-primary w-full mt-4 py-3 text-md btn-login" type="submit" disabled={loading}>
                {loading ? 'Menyiapkan Akun...' : 'Lanjut ke Setup Toko →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateStore} className="flex-col gap-4">
              <div className="form-group floating-group">
                <input 
                  type="text" 
                  className="input floating-input" 
                  placeholder=" "
                  value={form.store_name} 
                  onChange={e => set('store_name', e.target.value)}
                  required 
                />
                <label className="floating-label">Nama Toko / Usaha</label>
              </div>

              <div className="form-group floating-group">
                <input 
                  type="text" 
                  className="input floating-input" 
                  placeholder=" "
                  value={form.city} 
                  onChange={e => set('city', e.target.value)}
                />
                <label className="floating-label">Kota (Opsional)</label>
              </div>

              <div className="form-group floating-group">
                <input 
                  type="tel" 
                  className="input floating-input" 
                  placeholder=" "
                  value={form.phone} 
                  onChange={e => set('phone', e.target.value)}
                />
                <label className="floating-label">Nomor Telepon (Opsional)</label>
              </div>

              <button className="btn btn-primary w-full mt-4 py-3 text-md btn-login" type="submit" disabled={loading}>
                {loading ? 'Membuat sistem...' : '🎉 Mulai Berjualan!'}
              </button>
            </form>
          )}

          <div className="login-hint mt-8 text-center border-t border-border pt-6">
            <p className="text-sm text-muted">
              Sudah punya akun Kassa? <br/>
              <Link to="/login" className="text-primary font-bold hover:underline mt-2 inline-block">Masuk di sini</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Visual & USP */}
      <div className="split-right">
        <div className="split-right-overlay"></div>
        <div className="mesh-bg"></div>
        <div className="usp-content">
          <div className="usp-cards-container">
            <div className="usp-card glass">
              <div className="usp-icon bg-primary/20 text-primary">
                <WifiOff size={24} />
              </div>
              <h3 className="text-lg font-bold mt-3 mb-1">Offline-First Technology</h3>
              <p className="text-sm text-white/80">Mati lampu atau internet putus? Bukan masalah. Aplikasi kasir tetap jalan tanpa henti.</p>
            </div>
            <div className="usp-card glass mt-4">
              <div className="usp-icon bg-primary/20 text-primary">
                <Store size={24} />
              </div>
              <h3 className="text-lg font-bold mt-3 mb-1">Multi-Cabang Fleksibel</h3>
              <p className="text-sm text-white/80">Pantau performa ratusan toko, atur stok terpisah, dan bagikan produk antar cabang semudah klik.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
