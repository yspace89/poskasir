import { useState } from 'react';
import { supabase } from '../db/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { WifiOff, Store } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message || 'Login gagal. Periksa email dan password Anda.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout">
      {/* Left Panel: Form */}
      <div className="split-left">
        <div className="login-form-container">
          <div className="brand-header mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Kassa</h1>
            <h2 className="text-xl font-semibold text-text-main">Selamat Datang Kembali 👋</h2>
            <p className="text-sm text-muted mt-1">Lanjutkan Bisnis Anda. Satu pintu untuk memantau semua cabang.</p>
          </div>

          <form onSubmit={handleLogin} className="flex-col gap-5">
            <div className="form-group floating-group">
              <input 
                type="email" 
                className="input floating-input" 
                placeholder=" "
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                disabled={loading}
              />
              <label className="floating-label">Alamat Email</label>
            </div>

            <div className="form-group floating-group mt-2">
              <input 
                type="password" 
                className="input floating-input" 
                placeholder=" "
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                disabled={loading}
              />
              <label className="floating-label">Password</label>
            </div>
            
            {error && <p className="text-danger text-xs mt-1 bg-danger/10 p-2 rounded">{error}</p>}
            
            <button type="submit" className="btn btn-primary w-full mt-4 py-3 text-md btn-login" disabled={loading}>
              {loading ? 'Memeriksa Akses...' : 'Masuk ke Dasbor'}
            </button>
          </form>

          <div className="login-hint mt-8 text-center border-t border-border pt-6">
            <p className="text-sm text-muted">
              Belum punya akun Kassa? <br/>
              <Link to="/register" className="text-primary font-bold hover:underline mt-2 inline-block">Daftar sekarang, Gratis!</Link>
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
