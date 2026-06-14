import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  cart: [],
  appliedDiscount: null,

  addToCart: (product) => {
    set((state) => {
      const existing = state.cart.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return state; // Cannot exceed stock
        return {
          cart: state.cart.map(item => 
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item
          )
        };
      }
      return { cart: [...state.cart, { ...product, qty: 1 }] };
    });
  },

  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter(item => item.id !== productId)
    }));
  },

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set((state) => ({
      cart: state.cart.map(item => {
        if (item.id === productId) {
          return { ...item, qty: Math.min(qty, item.stock) };
        }
        return item;
      })
    }));
  },

  setAppliedDiscount: (discount) => {
    set({ appliedDiscount: discount });
  },

  clearCart: () => {
    set({ cart: [], appliedDiscount: null });
  },

  // Derived state getters
  getTotals: () => {
    const { cart, appliedDiscount } = get();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    let discountAmount = 0;
    if (appliedDiscount && subtotal >= appliedDiscount.min_purchase) {
      if (appliedDiscount.discount_type === 'percent') {
        discountAmount = subtotal * (appliedDiscount.value / 100);
      } else {
        discountAmount = appliedDiscount.value;
      }
    }
    
    const total = Math.max(0, subtotal - discountAmount);
    
    return { subtotal, discountAmount, total };
  }
}));
