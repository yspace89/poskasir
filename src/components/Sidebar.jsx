import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, LogOut, Clock, Settings, Users, Tag, LayoutDashboard, ChevronDown, Store, Lock, CreditCard } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import './Sidebar.css';

export default function Sidebar({ onLogout, user }) {
  const { store, org, role, allStores, switchStore, can } = useStore();
  const { canUse, plan } = usePlan();
  const [duration, setDuration] = useState('00:00:00');
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Date.now() - startTime);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = n => n.toString().padStart(2, '0');
      setDuration(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const navLinkClass = ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`;

  const canMultiOutlet = canUse('multi_outlet');

  return (
    <aside className="sidebar">
      {/* ── Branding ── */}
      <div className="sidebar-brand">
        <div className="brand-logo">K</div>
        <div className="brand-info">
          <h2 className="brand-name">Kassa</h2>
          <span className={`brand-plan ${plan === 'premium' ? 'premium' : 'free'}`}>
            {plan === 'premium' ? '⭐ Premium' : '🆓 Free'}
          </span>
        </div>
      </div>

      {/* ── Store Switcher ── */}
      <div className="store-info">
        <div
          className={`store-switcher ${allStores.length > 1 && canMultiOutlet ? 'clickable' : ''}`}
          onClick={() => allStores.length > 1 && canMultiOutlet && setShowStoreSwitcher(v => !v)}
        >
          <Store size={14} className="text-muted" />
          <div className="store-switcher-text">
            <span className="store-name">{store?.name || 'Memuat...'}</span>
            <span className="store-city text-xs text-muted">{store?.city || ''}</span>
          </div>
          {allStores.length > 1 && canMultiOutlet && (
            <ChevronDown size={14} className={`text-muted switcher-chevron ${showStoreSwitcher ? 'open' : ''}`} />
          )}
        </div>

        {showStoreSwitcher && canMultiOutlet && (
          <div className="store-dropdown">
            {allStores.map(s => (
              <button
                key={s.id}
                className={`store-option ${s.id === store?.id ? 'active' : ''}`}
                onClick={() => { switchStore(s.id); setShowStoreSwitcher(false); }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── User Info ── */}
      <div className="user-info">
        <div className="user-avatar">
          {user?.email?.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <p className="user-name">{user?.email?.split('@')[0]}</p>
          <p className="user-role">{role}</p>
        </div>
      </div>

      {/* ── Timer Shift ── */}
      <div className="shift-timer">
        <Clock size={12} />
        <span>{duration}</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/pos" className={navLinkClass}>
          <ShoppingCart size={18} />
          <span>Point of Sale</span>
        </NavLink>

        <div className="nav-section-label">Manajemen</div>

        <NavLink to="/products" className={navLinkClass} onClick={(e) => !can('manage_products') && e.preventDefault()}>
          <Package size={18} />
          <span>Produk</span>
          {!can('manage_products') && <Lock size={14} className="text-muted ml-auto" />}
        </NavLink>

        <NavLink to="/discounts" className={navLinkClass} onClick={(e) => (!can('manage_discounts') || !canUse('discounts')) && e.preventDefault()}>
          <Tag size={18} />
          <span>Diskon</span>
          {!canUse('discounts') ? (
            <span className="nav-badge-premium ml-auto">PRO</span>
          ) : (
            !can('manage_discounts') && <Lock size={14} className="text-muted ml-auto" />
          )}
        </NavLink>

        <NavLink to="/reports" className={navLinkClass} onClick={(e) => !can('view_reports') && e.preventDefault()}>
          <BarChart3 size={18} />
          <span>Laporan</span>
          {!can('view_reports') && <Lock size={14} className="text-muted ml-auto" />}
        </NavLink>

        <div className="nav-section-label">Pengaturan</div>

        <NavLink to="/team" className={navLinkClass} onClick={(e) => !can('manage_team') && e.preventDefault()}>
          <Users size={18} />
          <span>Tim</span>
          {!can('manage_team') && <Lock size={14} className="text-muted ml-auto" />}
        </NavLink>

        <NavLink to="/store-settings" className={navLinkClass} onClick={(e) => !can('manage_store') && e.preventDefault()}>
          <Settings size={18} />
          <span>Pengaturan Cabang</span>
          {!can('manage_store') && <Lock size={14} className="text-muted ml-auto" />}
        </NavLink>

        <NavLink to="/billing" className={navLinkClass} onClick={(e) => !can('manage_store') && e.preventDefault()}>
          <CreditCard size={18} />
          <span>Langganan & Tagihan</span>
          {!can('manage_store') && <Lock size={14} className="text-muted ml-auto" />}
        </NavLink>
      </nav>

      {/* ── Logout ── */}
      <div className="sidebar-footer">
        <button className="btn btn-outline w-full" onClick={onLogout}>
          <LogOut size={16} />
          <span>Tutup Shift</span>
        </button>
      </div>
    </aside>
  );
}
