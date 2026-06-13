import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, LogOut, Clock } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ onLogout, user }) {
  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    // Gunakan user.loginAt dari Supabase, atau waktu komponen pertama kali dimuat jika undefined
    const startTime = user?.loginAt ? new Date(user.loginAt).getTime() : Date.now();

    const calculateDuration = () => {
      const now = new Date().getTime();
      let diffMs = now - startTime;
      
      if (diffMs < 0) diffMs = 0; // Cegah waktu negatif jika ada perbedaan zona waktu

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const format = (n) => n.toString().padStart(2, '0');
      setDuration(`${format(hours)}:${format(minutes)}:${format(seconds)}`);
    };

    calculateDuration(); // run once immediately
    const interval = setInterval(calculateDuration, 1000);

    return () => clearInterval(interval);
  }, [user?.loginAt]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ marginBottom: '1rem' }}>
        <h2>POS Kasir</h2>
        <div style={{ marginTop: '0.5rem' }}>
          <p className="text-sm font-medium" style={{ margin: 0 }}>Kasir: {user?.name}</p>
          <p className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <Clock size={12} /> Jumlah jam kerja: {duration}
          </p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/pos" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={20} />
          <span>Point of Sale</span>
        </NavLink>
        {['admin', 'trainee'].includes(user?.role) && (
          <>
            <NavLink to="/products" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Package size={20} />
              <span>Produk</span>
            </NavLink>
            <NavLink to="/reports" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <BarChart3 size={20} />
              <span>Laporan</span>
            </NavLink>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <button className="btn btn-outline w-full" onClick={onLogout}>
          <LogOut size={16} />
          <span>Tutup Shift</span>
        </button>
      </div>
    </aside>
  );
}
