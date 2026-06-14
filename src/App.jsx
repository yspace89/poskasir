import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './db/supabaseClient';
import { CartProvider } from './context/CartContext';
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
import './App.css';

// Inner app: hanya dirender kalau sudah ada user & store context
function AppInner({ user, onLogout }) {
  const { store, loading: storeLoading, role } = useStore();

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
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
    <CartProvider>
      <Router>
        <div className="app-container">
          <Sidebar user={user} onLogout={onLogout} />
          <main className="main-content">
            <Routes>
              {/* Semua user bisa akses POS */}
              <Route path="/pos" element={<POS />} />

              {/* Hanya role yang punya akses manage_products */}
              {['owner', 'manager'].includes(role) && (
                <>
                  <Route path="/products" element={<ProductManagement />} />
                  <Route path="/discounts" element={<DiscountManagement />} />
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
    </CartProvider>
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
            Kasirind
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
    <StoreProvider userId={user.id}>
      <PlanProvider>
        <AppInner user={user} onLogout={handleLogout} />
      </PlanProvider>
    </StoreProvider>
  );
}

export default App;
