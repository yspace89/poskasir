import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { supabase } from '../db/supabaseClient';
import { X, CreditCard, Banknote, QrCode } from 'lucide-react';
import './PaymentModal.css';

export default function PaymentModal({ onClose, onSuccess }) {
  const { store } = useStore();
  const { isPremium, limits } = usePlan();
  const { cart, clearCart, appliedDiscount, getTotals } = useCartStore();
  const { total, discountAmount } = getTotals();
  
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, qris, card
  const [tenderedAmount, setTenderedAmount] = useState(total);
  const [loading, setLoading] = useState(false);

  const change = Math.max(0, tenderedAmount - total);
  const isValid = tenderedAmount >= total;

  const handleComplete = async () => {
    if (!isValid || loading) return;
    
    // Check limit free plan
    if (!isPremium && navigator.onLine) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      try {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .gte('date', startOfMonth);
          
        if (count >= limits.transactions_per_month) {
          alert(`Limit Paket Free: Maksimal ${limits.transactions_per_month} transaksi/bulan telah tercapai. Harap upgrade ke Premium.`);
          return;
        }
      } catch(e) {
         // ignore limit check if offline
      }
    }

    setLoading(true);

    try {
      // 1. Ambil data kasir lokal (bisa dari localStorage / state nanti, untuk offline ini fallback)
      let cashierName = 'Kasir';
      let validCashierId = null;

      if (navigator.onLine) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
           const { data: profile } = await supabase.from('profiles').select('id, full_name').eq('id', userId).single();
           if (profile) {
               if (profile.full_name) cashierName = profile.full_name;
               validCashierId = profile.id;
           }
        }
      }

      const transactionPayload = {
        store_id: store.id,
        org_id: store.org_id,
        date: new Date().toISOString(),
        total,
        discount_id: appliedDiscount ? appliedDiscount.id : null,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
        tendered_amount: tenderedAmount,
        change,
        cashier_id: validCashierId,
        status: 'completed'
      };

      const itemsPayload = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        qty: item.qty,
        price: item.price
      }));

      // INSERT KE LOKAL DEXIE (SYNC QUEUE)
      const { db } = await import('../db/localDb');
      const tempId = await db.sync_queue.add({
        type: 'transaction',
        payload: {
          transaction: transactionPayload,
          items: itemsPayload,
          cashierName
        },
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // Kurangi stok di lokal (Optimistic update)
      await db.transaction('rw', db.products, async () => {
        for (const item of cart) {
          const product = await db.products.get(item.id);
          if (product) {
            await db.products.update(item.id, { stock: Math.max(0, product.stock - item.qty) });
          }
        }
      });

      const receiptData = {
        id: `LOC-${tempId}`, // Temporary ID
        date: transactionPayload.date,
        items: cart,
        total,
        discountAmount,
        paymentMethod,
        tenderedAmount,
        change,
        cashierName: cashierName
      };

      clearCart();
      onSuccess(receiptData);
    } catch (err) {
      console.error('Error saat checkout:', err);
      alert('Gagal memproses transaksi: ' + (err.message || 'Error lokal.'));
    } finally {
      setLoading(false);
    }
  };

  const setExactAmount = () => setTenderedAmount(total);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="text-xl font-bold">Pembayaran</h2>
          <button className="btn-close" onClick={onClose}><X size={24}/></button>
        </div>

        <div className="modal-body p-6">
          <div className="payment-summary text-center mb-6">
            <p className="text-muted text-sm mb-1">Total Tagihan</p>
            <h3 className="text-4xl font-bold text-primary">Rp {total.toLocaleString('id-ID')}</h3>
          </div>

          <div className="payment-methods grid grid-cols-3 gap-2 mb-6">
            <button 
              className={`method-btn ${paymentMethod === 'cash' ? 'active bg-primary text-white' : 'bg-gray-100'} p-3 rounded-xl flex flex-col items-center gap-2`}
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote size={24} />
              <span className="text-xs font-bold">Tunai</span>
            </button>
            <button 
              className={`method-btn ${paymentMethod === 'qris' ? 'active bg-primary text-white' : 'bg-gray-100'} p-3 rounded-xl flex flex-col items-center gap-2`}
              onClick={() => {
                setPaymentMethod('qris');
                setTenderedAmount(total);
              }}
            >
              <QrCode size={24} />
              <span className="text-xs font-bold">QRIS</span>
            </button>
            <button 
              className={`method-btn ${paymentMethod === 'card' ? 'active bg-primary text-white' : 'bg-gray-100'} p-3 rounded-xl flex flex-col items-center gap-2`}
              onClick={() => {
                setPaymentMethod('card');
                setTenderedAmount(total);
              }}
            >
              <CreditCard size={24} />
              <span className="text-xs font-bold">Kartu</span>
            </button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="cash-input-section animate-fade-in">
              <label className="text-sm font-bold mb-2 block">Uang Diterima</label>
              <div className="flex gap-2 mb-4">
                <input 
                  type="number" 
                  className="input text-xl font-bold" 
                  value={tenderedAmount || ''}
                  onChange={(e) => setTenderedAmount(Number(e.target.value))}
                  autoFocus
                />
                <button className="btn btn-outline whitespace-nowrap" onClick={setExactAmount}>Uang Pas</button>
              </div>
              
              <div className="quick-cash-buttons grid grid-cols-4 gap-2 mb-6">
                {[50000, 100000, 150000, 200000].map(amt => (
                  <button key={amt} className="btn bg-gray-100 hover:bg-gray-200 text-sm font-bold" onClick={() => setTenderedAmount(amt)}>
                    {amt / 1000}k
                  </button>
                ))}
              </div>

              <div className="change-summary p-4 bg-gray-50 rounded-xl border border-border text-center">
                <p className="text-sm font-bold text-muted mb-1">Kembalian</p>
                <h4 className="text-2xl font-black text-accent">Rp {change.toLocaleString('id-ID')}</h4>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer p-4 border-t">
          <button className="btn btn-outline flex-1" onClick={onClose} disabled={loading}>Batal</button>
          <button 
            className="btn btn-primary flex-1" 
            onClick={handleComplete}
            disabled={!isValid || loading}
          >
            {loading ? 'Memproses...' : 'Selesaikan'}
          </button>
        </div>
      </div>
    </div>
  );
}
