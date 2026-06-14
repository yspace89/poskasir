import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { supabase } from '../db/supabaseClient';
import { Trash2, Plus, Minus, Tag, Lock } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function Cart({ onCheckout }) {
  const { store } = useStore();
  const { isPremium } = usePlan();
  
  const { 
    cart, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    appliedDiscount,
    setAppliedDiscount,
    getTotals
  } = useCartStore();
  
  const { subtotal, discountAmount, total } = getTotals();

  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const applyDiscount = async () => {
    setDiscountError('');
    if (!discountCode) return;
    if (!isPremium) {
      setDiscountError('Fitur diskon hanya tersedia di Premium.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('store_id', store.id)
        .eq('code', discountCode.toUpperCase())
        .single();

      if (error || !data) {
        setDiscountError('Kode promo tidak ditemukan.');
        return;
      }

      if (!data.is_active) {
        setDiscountError('Kode promo sudah tidak aktif.');
        return;
      }

      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        setDiscountError('Kode promo sudah kedaluwarsa.');
        return;
      }

      if (subtotal < data.min_purchase) {
        setDiscountError(`Minimal belanja Rp ${data.min_purchase.toLocaleString('id-ID')}`);
        return;
      }

      setAppliedDiscount(data);
      setDiscountCode('');
    } catch (err) {
      setDiscountError('Terjadi kesalahan.');
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-bold">Keranjang</h2>
        {cart.length > 0 && (
          <button className="btn btn-outline text-danger !px-3 !py-1.5" onClick={() => setShowClearConfirm(true)}>
            <Trash2 size={16} />
            <span className="hidden sm:inline">Bersihkan</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {cart.length === 0 ? (
          <div className="text-center mt-8 text-muted">
            <p>Belum ada item di keranjang.</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="flex justify-between items-start pb-4 border-b border-dashed border-border last:border-0 last:pb-0">
              <div className="flex-1 pr-4">
                <h4 className="text-sm font-semibold mb-1">{item.name}</h4>
                <p className="text-sm text-muted">Rp {item.price.toLocaleString('id-ID')}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-bg-main p-1 rounded-md border border-border">
                  <button className="p-1 hover:bg-border rounded text-text-main disabled:opacity-50" onClick={() => updateQuantity(item.id, item.qty - 1)}><Minus size={14}/></button>
                  <input 
                    type="number"
                    value={item.qty}
                    onChange={(e) => {
                       const val = parseInt(e.target.value) || 1;
                       updateQuantity(item.id, Math.min(val, item.stock));
                    }}
                    className="w-10 text-center font-medium text-sm bg-transparent outline-none border-none hide-arrows"
                    style={{ WebkitAppearance: 'none', margin: 0 }}
                  />
                  <button className="p-1 hover:bg-border rounded text-text-main disabled:opacity-50" onClick={() => updateQuantity(item.id, item.qty + 1)} disabled={item.qty >= item.stock}><Plus size={14}/></button>
                </div>
                <button className="p-1 hover:opacity-80 text-danger" onClick={() => removeFromCart(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="p-6 border-t border-border bg-bg-card rounded-b-xl">
          <div className="flex justify-between mb-2">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          
          <div className="my-4 py-4 border-y border-dashed border-border">
            <label className="text-xs font-medium text-muted flex items-center gap-1 mb-2">
              Kode Promo / Diskon
              {!isPremium && <Lock size={12} className="text-warning" title="Premium Feature" />}
            </label>
            {appliedDiscount ? (
              <div className="flex items-center justify-between p-2 bg-bg-main rounded-md border border-accent">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-accent" />
                  <span className="text-sm font-bold text-accent">{appliedDiscount.code}</span>
                </div>
                <button className="text-xs text-danger font-medium hover:underline" onClick={removeDiscount}>Hapus</button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="input text-sm uppercase" 
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder={isPremium ? "Masukkan kode promo" : "Upgrade Premium untuk diskon"}
                    disabled={!isPremium}
                  />
                  <button className="btn btn-outline text-sm" onClick={applyDiscount} disabled={!isPremium}>Gunakan</button>
                </div>
                {discountError && <p className="text-xs text-danger mt-1">{discountError}</p>}
              </div>
            )}
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between mb-2 text-danger">
              <span>Diskon</span>
              <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-4">
            <span className="text-lg font-bold">Total</span>
            <span className="text-xl font-bold text-primary">Rp {total.toLocaleString('id-ID')}</span>
          </div>

          <button className="btn btn-primary w-full mt-6 py-3 text-lg h-14" onClick={onCheckout}>
            Bayar (Rp {total.toLocaleString('id-ID')})
          </button>
        </div>
      )}

      <ConfirmModal 
        isOpen={showClearConfirm}
        title="Kosongkan Keranjang"
        message="Apakah Anda yakin ingin membuang semua pesanan di keranjang ini?"
        type="danger"
        confirmText="Ya, Kosongkan"
        onConfirm={() => { clearCart(); setShowClearConfirm(false); }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
