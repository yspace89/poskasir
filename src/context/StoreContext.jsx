/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';

const StoreContext = createContext(null);

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
};

export const StoreProvider = ({ children, userId }) => {
  const [org, setOrg] = useState(null);
  const [store, setStore] = useState(null);
  const [member, setMember] = useState(null); // org_members row
  const [storeMember, setStoreMember] = useState(null); // store_members row
  const [allStores, setAllStores] = useState([]); // semua store dalam org (untuk switcher)
  const [loading, setLoading] = useState(true);

  const loadContext = async (uid) => {
    if (!uid) { setLoading(false); return; }
    try {
      // 1. Ambil org_member untuk user ini (mengambil org sekaligus)
      const { data: memberData } = await supabase
        .from('org_members')
        .select('*, organizations(*)')
        .eq('user_id', uid)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!memberData) { setLoading(false); return; }

      setMember(memberData);
      setOrg(memberData.organizations);

      // 2. Ambil semua store dalam org
      const { data: storesData } = await supabase
        .from('stores')
        .select('*')
        .eq('org_id', memberData.org_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (storesData) setAllStores(storesData);

      // 3. Pilih store aktif: simpan di localStorage agar tidak reset tiap refresh
      const savedStoreId = localStorage.getItem(`Kassa_store_${uid}`);
      let activeStore = storesData?.find(s => s.id === savedStoreId) || storesData?.[0];
      if (activeStore) setStore(activeStore);

      // 4. Ambil store_member untuk permissions granular
      if (activeStore) {
        const { data: smData } = await supabase
          .from('store_members')
          .select('*')
          .eq('store_id', activeStore.id)
          .eq('user_id', uid)
          .single();
        if (smData) setStoreMember(smData);
      }
    } catch (err) {
      console.error('StoreContext error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Switch outlet aktif
  const switchStore = async (storeId) => {
    const target = allStores.find(s => s.id === storeId);
    if (!target || !userId) return;
    setStore(target);
    localStorage.setItem(`Kassa_store_${userId}`, storeId);

    // Reload store_member permissions untuk toko baru
    const { data: smData } = await supabase
      .from('store_members')
      .select('*')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .single();
    setStoreMember(smData || null);
  };

  // Shortcut: cek apakah user punya permission tertentu
  const can = (permission) => {
    if (!member) return false;
    const role = storeMember?.role || member?.role;
    // owner punya semua akses
    if (role === 'owner') return true;
    // cek per permission
    switch (permission) {
      case 'manage_products':
        return storeMember?.can_manage_products || role === 'manager';
      case 'view_reports':
        return storeMember?.can_view_reports || role === 'manager';
      case 'void_transactions':
        return storeMember?.can_void_transactions || role === 'manager';
      case 'manage_discounts':
        return storeMember?.can_manage_discounts || role === 'manager';
      case 'manage_team':
        return storeMember?.can_manage_team || false;
      case 'manage_store':
        return role === 'owner' || role === 'manager';
      default:
        return false;
    }
  };

  const role = storeMember?.role || member?.role || 'cashier';

  return (
    <StoreContext.Provider value={{
      org,
      store,
      member,
      storeMember,
      allStores,
      loading,
      role,
      can,
      switchStore,
      refreshContext: () => loadContext(userId),
    }}>
      {children}
    </StoreContext.Provider>
  );
};
