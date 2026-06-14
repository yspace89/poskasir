/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react';
import { useStore } from './StoreContext';

const PlanContext = createContext(null);

export const usePlan = () => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider');
  return ctx;
};

// Definisi batas tiap plan
const PLAN_LIMITS = {
  free: {
    outlets: 1,
    users: 2,
    products: 50,
    transactions_per_month: 200,
  },
  premium: {
    outlets: Infinity,
    users: Infinity,
    products: Infinity,
    transactions_per_month: Infinity,
  },
};

// Fitur yang hanya tersedia di premium
const PREMIUM_FEATURES = [
  'discounts',         // Manajemen diskon & kode promo
  'export_reports',    // Export CSV/PDF laporan
  'reports_chart',     // Grafik di halaman laporan
  'stock_history',     // Riwayat mutasi stok
  'multi_outlet',      // Manajemen multi-outlet
  'import_products',   // Import produk via CSV
  'team_management_advanced', // undang > 2 user
];

export const PlanProvider = ({ children }) => {
  const { org } = useStore();

  const plan = org?.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Cek apakah sebuah fitur tersedia di plan ini
  const canUse = useMemo(() => (feature) => {
    if (plan === 'premium') return true;
    return !PREMIUM_FEATURES.includes(feature);
  }, [plan]);

  // Cek apakah masih dalam batas limit (misal jumlah produk)
  const withinLimit = useMemo(() => (limitKey, currentCount) => {
    const max = limits[limitKey];
    if (max === Infinity) return true;
    return currentCount < max;
  }, [limits]);

  return (
    <PlanContext.Provider value={{
      plan,
      limits,
      canUse,
      withinLimit,
      isPremium: plan === 'premium',
      isFree: plan === 'free',
    }}>
      {children}
    </PlanContext.Provider>
  );
};

// Komponen helper: tampilkan badge "Premium" + tooltip jika fitur terkunci
export const PremiumBadge = ({ feature, children, className = '' }) => {
  const { canUse } = usePlan();
  if (canUse(feature)) return children;

  return (
    <div className={`premium-gate ${className}`} title="Fitur ini hanya tersedia di plan Premium">
      {children}
      <span className="premium-lock-badge">⭐ Premium</span>
    </div>
  );
};
