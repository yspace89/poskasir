import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { supabase } from '../db/supabaseClient';
import { Trash2, Plus, Minus, Tag } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import './Cart.css';

export default function Cart({ onCheckout }) {
  const { 
    cart, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    subtotal,
    appliedDiscount,
    setAppliedDiscount,
    discountAmount,
    total
  } = useCart();

  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const applyDiscount = async () => {
    setDiscountError('');
    if (!discountCode) return;

    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
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
    <div className="cart-container">
      <div className="cart-header">
        <h2 className="text-lg font-bold">Keranjang</h2>
        {cart.length > 0 && (
          <button className="btn btn-outline text-danger" onClick={() => setShowClearConfirm(true)}>
            <Trash2 size={16} />
            Bersihkan
          </button>
        )}
      </div>

      <div className="cart-items">
        {cart.length === 0 ? (
          <div className="cart-empty text-muted">
            <p>Belum ada item di keranjang.</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="cart-item">
              <div className="item-info">
                <h4 className="item-name">{item.name}</h4>
                <p className="item-price">Rp {item.price.toLocaleString('id-ID')}</p>
              </div>
              <div className="item-actions">
                <div className="qty-control">
                  <button onClick={() => updateQuantity(item.id, item.qty - 1)}><Minus size={14}/></button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQuantity(item.id, item.qty + 1)} disabled={item.qty >= item.stock}><Plus size={14}/></button>
                </div>
                <button className="btn-remove" onClick={() => removeFromCart(item.id)}>
                  <Trash2 size={16} className="text-danger" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="cart-footer">
          <div className="summary-row">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          
          <div className="discount-control">
            <label className="text-xs font-medium text-muted">Kode Promo / Diskon</label>
            {appliedDiscount ? (
              <div className="flex items-center justify-between p-2 bg-main rounded-md border border-accent">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-accent" />
                  <span className="text-sm font-bold text-accent">{appliedDiscount.code}</span>
                </div>
                <button className="text-xs text-danger" onClick={removeDiscount}>Hapus</button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="input text-sm" 
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Masukkan kode promo"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button className="btn btn-outline text-sm" onClick={applyDiscount}>Gunakan</button>
                </div>
                {discountError && <p className="text-xs text-danger mt-1">{discountError}</p>}
              </div>
            )}
          </div>

          {discountAmount > 0 && (
            <div className="summary-row text-danger">
              <span>Diskon</span>
              <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
            </div>
          )}
          
          <div className="summary-row total-row">
            <span className="text-lg font-bold">Total</span>
            <span className="text-xl font-bold text-primary">Rp {total.toLocaleString('id-ID')}</span>
          </div>

          <button className="btn btn-primary w-full mt-4 py-3 text-lg" onClick={onCheckout}>
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
        onConfirm={() => clearCart()}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
