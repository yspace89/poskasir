import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../db/supabaseClient';
import { db } from '../db/localDb';
import { useStore } from '../context/StoreContext';

export function useSyncEngine() {
  const { org, store } = useStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(() => localStorage.getItem(`Kassa_last_sync_${org?.id}`));

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncAll();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync
    if (navigator.onLine && org && store) {
      syncAll();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, store]);

  const syncAll = useCallback(async () => {
    if (!org || !store || !navigator.onLine || isSyncing) return;
    
    setIsSyncing(true);
    try {
      // 1. PUSH: Kirim data antrean lokal (Transaksi) ke Supabase
      const pendingQueue = await db.sync_queue.where('status').equals('pending').toArray();
      
      for (const item of pendingQueue) {
        if (item.type === 'transaction') {
          const { transaction, items } = item.payload;
          
          // Insert transaction
          const { data: trxData, error: trxErr } = await supabase
            .from('transactions')
            .insert([transaction])
            .select();
            
          if (trxErr) throw trxErr;
          
          const newTrxId = trxData[0].id;
          
          // Format items
          const itemsToInsert = items.map(it => ({
            ...it,
            transaction_id: newTrxId
          }));
          
          const { error: itmErr } = await supabase.from('transaction_items').insert(itemsToInsert);
          if (itmErr) throw itmErr;
          
          // Mark as synced
          await db.sync_queue.update(item.id, { status: 'synced', synced_at: new Date().toISOString() });
        }
      }

      // Bersihkan queue lama (opsional)
      await db.sync_queue.where('status').equals('synced').delete();

      // 2. PULL: Tarik data Produk & Kategori dari Supabase ke lokal
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').eq('org_id', org.id),
        supabase.from('products').select('*')
          .eq('store_id', store.id)
          .eq('is_active', true)
      ]);

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;

      // Update Dexie (Overwite dengan data master server)
      await db.transaction('rw', db.categories, db.products, async () => {
        // Hapus yang ada dan timpa dengan master server agar 100% sinkron
        await db.categories.clear();
        await db.products.clear();
        
        if (catRes.data.length > 0) await db.categories.bulkAdd(catRes.data);
        if (prodRes.data.length > 0) await db.products.bulkAdd(prodRes.data);
      });

      const now = new Date().toISOString();
      localStorage.setItem(`Kassa_last_sync_${org.id}`, now);
      setLastSync(now);

    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [org, store, isSyncing]);

  return {
    isOnline,
    isSyncing,
    lastSync,
    triggerSync: syncAll
  };
}
