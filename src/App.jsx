import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './db/supabaseClient';
import { CartProvider } from './context/CartContext';
import Sidebar from './components/Sidebar';
import POS from './pages/POS';
import ProductManagement from './pages/ProductManagement';
import Reports from './pages/Reports';
import Login from './pages/Login';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shiftId, setShiftId] = useState(null);

  const loadUserProfile = async (session) => {
    try {
      // 1. Fetch Profile
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        // Fallback if trigger hasn't finished or something
        const isAdminTrainee = session.user.email.includes('admin');
        profile = { full_name: isAdminTrainee ? 'Admin Trainee' : session.user.email.split('@')[0], role: isAdminTrainee ? 'trainee' : 'kasir' };
      }

      // 2. Start Shift Log
      const { data: shift } = await supabase
        .from('shift_logs')
        .insert([{ user_id: session.user.id }])
        .select()
        .single();

      if (shift) setShiftId(shift.id);

      setUser({
        id: session.user.id,
        name: profile.full_name || session.user.email.split('@')[0],
        email: session.user.email,
        role: profile.role,
        loginAt: shift ? shift.start_time : session.user.last_sign_in_at || new Date().toISOString()
      });
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserProfile(session).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN' && session) {
        loadUserProfile(session);
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        setShiftId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    return <Login onLogin={() => { }} />; // authStateChange will handle the state update
  }

  const handleLogout = async () => {
    if (shiftId) {
      await supabase.from('shift_logs').update({ end_time: new Date().toISOString() }).eq('id', shiftId);
    }
    await supabase.auth.signOut();
  };

  return (
    <CartProvider>
      <Router>
        <div className="app-container">
          <Sidebar user={user} onLogout={handleLogout} />
          <main className="main-content">
            <Routes>
              <Route path="/pos" element={<POS />} />
              {['admin', 'trainee'].includes(user.role) && (
                <>
                  <Route path="/products" element={<ProductManagement userRole={user.role} />} />
                  <Route path="/reports" element={<Reports userRole={user.role} />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/pos" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
