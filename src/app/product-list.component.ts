import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { addToCart } from './cart.store';

@Component({
  standalone: true,
  selector: 'product-list',
  imports: [CommonModule, RouterLink],
  template: `
<section class="products">
  <h2>Products</h2>
  <div *ngIf="loading">Loading...</div>
  <div class="grid">
    <div class="card" *ngFor="let p of products">
      <img [src]="p.image" alt="{{p.title}}" />
      <h3>{{ p.title }}</h3>
      <p class="price">\${{ p.price }}</p>
      <p class="desc">{{ p.description }}</p>
      <div class="actions">
        <a [routerLink]="['/product', p.id]" class="btn">View</a>
        <button (click)="add(p)" class="btn primary">Add to cart</button>
      </div>
    </div>
  </div>
</section>
  `,
  styleUrls: ['./product-list.css'],
})
export class ProductList {
  products: any[] = [];
  loading = true;

  async ngOnInit() {
    // Avoid performing fetch during server-side rendering — do it only in browser.
    if (typeof window === 'undefined') {
      this.loading = false;
      return;
    }

    try {
      const base = (typeof window !== 'undefined' && window.location)
        ? (window.location.port === '4200' ? 'http://localhost:3001' : window.location.origin)
        : '';
      const url = base ? `${base}/api/products` : '/api/products';
      const res = await fetch(url);
      this.products = await res.json();
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  add(product: any) {
    addToCart(product);
  }
}
