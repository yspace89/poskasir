import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from './db/supabaseClient';
import { StoreProvider, useStore } from './context/StoreContext';
import { PlanProvider } from './context/PlanContext';
import Sidebar from './components/Sidebar';
import POS from './pages/POS';
import ProductManagement from './pages/ProductManagement';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import TeamManagement from './pages/TeamManagement';
import DiscountManagement from './pages/DiscountManagement';
import StoreSettings from './pages/StoreSettings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { useSyncEngine } from './hooks/useSyncEngine';

// Inner app: hanya dirender kalau sudah ada user & store context
function AppInner({ user, onLogout }) {
  const { store, loading: storeLoading, role } = useStore();
  useSyncEngine(); // Jalankan engine sinkronisasi offline-first

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Jika user tidak punya org/store → redirect onboarding
  if (!store) {
    return (
      <Router>
        <Routes>
          <Route path="/onboarding" element={<Onboarding user={user} />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-bg-main text-text-main">
        <Sidebar user={user} onLogout={onLogout} />
        <main className="flex-1 p-6 overflow-y-auto h-screen">
          <Routes>
            {/* Semua user bisa akses POS */}
            <Route path="/pos" element={<POS />} />

            {/* Hanya role yang punya akses manage_products */}
            {['owner', 'manager'].includes(role) && (
              <>
                <Route path="/products" element={<ProductManagement />} />
                <Route path="/discounts" element={<DiscountManagement />} />
                <Route path="/store-settings" element={<StoreSettings />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/team" element={<TeamManagement />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}

            {/* Dashboard untuk semua role selain cashier basic */}
            {['owner', 'manager', 'cashier'].includes(role) && (
              <Route path="/dashboard" element={<Dashboard />} />
            )}

            <Route path="*" element={<Navigate to="/pos" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>
            Kassa
          </h2>
          <p style={{ color: 'hsl(var(--text-muted))' }}>Memuat...</p>
        </div>
      </div>
    );
  }

  // Tidak login → tampilkan Login atau Register
  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    );
  }

  // Login → wrap dengan StoreProvider (load org/store dari DB)
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider userId={user.id}>
        <PlanProvider>
          <AppInner user={user} onLogout={handleLogout} />
        </PlanProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
