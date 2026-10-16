import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (item) => {
    // If the exact same medicine and batch is in cart, increase quantity
    setCartItems(prev => {
      const existingIdx = prev.findIndex(i => i.medicine_id === item.medicine_id && i.batch_id === item.batch_id);
      if (existingIdx >= 0) {
        const newCart = [...prev];
        newCart[existingIdx].quantity += item.quantity;
        return newCart;
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
