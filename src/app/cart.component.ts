import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cartItems, cartTotal, removeFromCart, clearCart } from './cart.store';

@Component({
  standalone: true,
  selector: 'cart-component',
  imports: [CommonModule],
  template: `
<section class="cart">
  <h2>Your Cart</h2>
  <div *ngIf="items().length === 0">Your cart is empty.</div>
  <ul>
    <li *ngFor="let it of items()">
      <img [src]="it.image" alt="{{it.title}}" />
      <div class="meta">
        <div class="title">{{it.title}}</div>
        <div class="qty">Qty: {{it.qty}}</div>
        <div class="price">\${{it.price}}</div>
      </div>
      <button (click)="remove(it.id)">Remove</button>
    </li>
  </ul>
  <div class="summary">
    <div>Total: \${{ total() }}</div>
    <button (click)="checkout()" class="btn primary" [disabled]="items().length === 0">Checkout</button>
  </div>
  <div *ngIf="message">{{message}}</div>
</section>
  `,
  styleUrls: ['./cart.component.css'],
})
export class CartComponent {
  items = cartItems;
  total = cartTotal;
  message: string | null = null;

  async checkout() {
    const payload = { items: this.items(), total: this.total() };
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { orderId } = await res.json();
        this.message = `Order received: #${orderId}`;
        clearCart();
      } else {
        this.message = 'Order failed';
      }
    } catch (e) {
      console.error(e);
      this.message = 'Order error';
    }
  }

  remove(id: any) {
    removeFromCart(id);
  }
}
