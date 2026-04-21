import { signal, computed } from '@angular/core';

export const cartItems = signal<any[]>([]);

export const addToCart = (product: any) => {
  const items = cartItems().slice();
  const found = items.find((i) => i.id === product.id);
  if (found) {
    found.qty = (found.qty || 1) + 1;
  } else {
    items.push({ ...product, qty: 1 });
  }
  cartItems.set(items);
};

export const removeFromCart = (id: any) => cartItems.set(cartItems().filter((i) => i.id !== id));
export const clearCart = () => cartItems.set([]);
export const cartTotal = computed(() => cartItems().reduce((s, i) => s + (i.price * (i.qty || 1)), 0));
