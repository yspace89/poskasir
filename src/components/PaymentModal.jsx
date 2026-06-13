import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { supabase } from '../db/supabaseClient';
import { X, CreditCard, Banknote, QrCode } from 'lucide-react';
import './PaymentModal.css';

export default function PaymentModal({ onClose, onSuccess }) {
  const { cart, total, discountAmount, appliedDiscount, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, qris, card
  const [tenderedAmount, setTenderedAmount] = useState(total);
  const [loading, setLoading] = useState(false);

  const change = Math.max(0, tenderedAmount - total);
  const isValid = tenderedAmount >= total;

  const handleComplete = async () => {
    if (!isValid || loading) return;
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      // Ambil cashier_name dari profiles jika ada
      let cashierName = 'Kasir';
      if (userId) {
         const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
         if (profile && profile.full_name) cashierName = profile.full_name;
      }

      // 1. Create Transaction Record
      const { data: transactionData, error: trxError } = await supabase.from('transactions').insert([{
        total,
        discount_id: appliedDiscount ? appliedDiscount.id : null,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
        tendered_amount: tenderedAmount,
        change,
        cashier_id: userId,
        status: 'completed'
      }]).select();

      if (trxError) throw trxError;
      const transactionId = transactionData[0].id;

      // 2. Insert Transaction Items (Trigger DB akan otomatis mengurangi stok dan membuat stock_logs)
      const itemsToInsert = cart.map(item => ({
        transaction_id: transactionId,
        product_id: item.id,
        product_name: item.name,
        qty: item.qty,
        price: item.price
      }));
      
      const { error: itemsError } = await supabase.from('transaction_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      const receiptData = {
        id: transactionId,
        date: transactionData[0].date,
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
      alert('Gagal menyelesaikan transaksi: ' + (err.message || 'Error koneksi.'));
    } finally {
      setLoading(false);
    }
  };

  const setExactAmount = () => setTenderedAmount(total);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2 className="text-xl font-bold">Pembayaran</h2>
          <button className="btn-close" onClick={onClose}><X size={24}/></button>
        </div>

        <div className="modal-body">
          <div className="payment-summary">
            <p className="text-muted text-sm">Total Tagihan</p>
            <h3 className="text-3xl font-bold text-primary">Rp {total.toLocaleString('id-ID')}</h3>
          </div>

          <div className="payment-methods">
            <button 
              className={`method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote size={24} />
              <span>Tunai</span>
            </button>
            <button 
              className={`method-btn ${paymentMethod === 'qris' ? 'active' : ''}`}
              onClick={() => {
                setPaymentMethod('qris');
                setTenderedAmount(total);
              }}
            >
              <QrCode size={24} />
              <span>QRIS</span>
            </button>
            <button 
              className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => {
                setPaymentMethod('card');
                setTenderedAmount(total);
              }}
            >
              <CreditCard size={24} />
              <span>Debit/Kredit</span>
            </button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="cash-input-section">
              <label className="text-sm font-medium mb-2 block">Uang Diterima</label>
              <div className="flex gap-2 mb-4">
                <input 
                  type="number" 
                  className="input text-lg" 
                  value={tenderedAmount || ''}
                  onChange={(e) => setTenderedAmount(Number(e.target.value))}
                  autoFocus
                />
                <button className="btn btn-outline" onClick={setExactAmount}>Uang Pas</button>
              </div>
              
              <div className="quick-cash-buttons grid grid-cols-4 gap-2 mb-4">
                {[50000, 100000, 150000, 200000].map(amt => (
                  <button key={amt} className="btn btn-outline text-sm" onClick={() => setTenderedAmount(amt)}>
                    {amt / 1000}k
                  </button>
                ))}
              </div>

              <div className="change-summary p-4 bg-main rounded-md border border-border">
                <p className="text-sm text-muted">Kembalian</p>
                <h4 className="text-xl font-bold text-accent">Rp {change.toLocaleString('id-ID')}</h4>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Batal</button>
          <button 
            className="btn btn-primary" 
            onClick={handleComplete}
            disabled={!isValid || loading}
          >
            {loading ? 'Memproses...' : 'Selesaikan Transaksi'}
          </button>
        </div>
      </div>
    </div>
  );
}
