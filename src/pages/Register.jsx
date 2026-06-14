import { useState } from 'react';
import { supabase } from '../db/supabaseClient';
import './Register.css';

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
    <div className="register-page">
      <div className="register-card glass">
        {/* Logo */}
        <div className="register-logo">
          <div className="logo-badge">K</div>
          <h1>Kasirind</h1>
        </div>

        {/* Step indicator */}
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="step-line" />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
        </div>

        <p className="step-label">
          {step === 1 ? 'Buat Akun' : 'Setup Toko Pertama'}
        </p>

        {error && <div className="error-banner">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleRegisterAccount} className="register-form">
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input className="input" type="text" required
                placeholder="Budi Santoso"
                value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" required
                placeholder="budi@email.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="input" type="password" required
                placeholder="Min. 6 karakter"
                value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Konfirmasi Password</label>
              <input className="input" type="password" required
                placeholder="Ulangi password"
                value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
            </div>
            <button className="btn btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Membuat akun...' : 'Lanjut →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateStore} className="register-form">
            <div className="form-group">
              <label>Nama Toko / Usaha</label>
              <input className="input" type="text" required
                placeholder="Warung Bu Siti"
                value={form.store_name} onChange={e => set('store_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Kota</label>
              <input className="input" type="text"
                placeholder="Jakarta"
                value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Nomor Telepon</label>
              <input className="input" type="tel"
                placeholder="08123456789"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <button className="btn btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Membuat toko...' : '🎉 Mulai Berjualan!'}
            </button>
          </form>
        )}

        <p className="register-footer">
          Sudah punya akun? <a href="/login">Masuk di sini</a>
        </p>
      </div>
    </div>
  );
}
