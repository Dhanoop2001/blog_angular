import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { addToCart } from './cart.store';

@Component({
  standalone: true,
  selector: 'product-detail',
  imports: [CommonModule, RouterLink],
  template: `
<section class="detail">
  <div *ngIf="loading">Loading...</div>
  <div *ngIf="!loading && product">
    <img [src]="product.image" alt="{{product.title}}" />
    <h2>{{product.title}}</h2>
    <p class="price">\${{product.price}}</p>
    <p>{{product.description}}</p>
    <div class="actions">
      <button (click)="add()" class="btn primary">Add to cart</button>
      <a [routerLink]="['/cart']" class="btn">Go to cart</a>
    </div>
  </div>
  <div *ngIf="!loading && !product">Product not found.</div>
</section>
  `,
  styleUrls: ['./product-detail.css'],
})
export class ProductDetail {
  product: any = null;
  loading = true;

  async ngOnInit() {
    try {
      const parts = location.pathname.split('/');
      const id = parts[parts.length - 1];
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) this.product = await res.json();
      else this.product = null;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  add() {
    if (this.product) addToCart(this.product);
  }
}
