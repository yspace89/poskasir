import { useState } from 'react';
import { supabase } from '../db/supabaseClient';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setError(error?.message || 'Login gagal. Periksa email dan password Anda.');
      } else {
        // Create a simple user object from auth data
        // For simple role management, we assume everyone is admin for now
        // OR you can use metadata: data.user.user_metadata.role
        const userObj = {
          id: data.user.id,
          name: data.user.email.split('@')[0], // Use part of email as name
          email: data.user.email,
          role: 'admin' // Default role
        };
        onLogin(userObj);
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <h1 className="text-2xl font-bold text-center mb-6 text-primary">POS Kasir Login</h1>
        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div className="form-group">
            <label className="text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              className="input" 
              placeholder="admin@tokoku.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group mt-3">
            <label className="text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-danger text-xs mt-2">{error}</p>}
          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
        <div className="login-hint">
          <p className="text-xs text-muted mt-4 text-center">
            Gunakan Email & Password yang terdaftar di Supabase Auth.
          </p>
        </div>
      </div>
    </div>
  );
}
