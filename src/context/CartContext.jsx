import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null); // { id, code, discount_type, value, min_purchase }

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev; // cannot exceed stock
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        return { ...item, qty: Math.min(qty, item.stock) };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedDiscount(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  let discountAmount = 0;
  if (appliedDiscount) {
    if (subtotal >= appliedDiscount.min_purchase) {
      if (appliedDiscount.discount_type === 'percent') {
        discountAmount = subtotal * (appliedDiscount.value / 100);
      } else {
        discountAmount = appliedDiscount.value;
      }
    }
  }
  
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      appliedDiscount,
      setAppliedDiscount,
      subtotal,
      discountAmount,
      total
    }}>
      {children}
    </CartContext.Provider>
  );
};
