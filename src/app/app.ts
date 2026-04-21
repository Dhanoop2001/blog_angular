import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from './auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NgIf],
  template: `
<style>
  :host { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; display:block; min-height:100vh }
  .site-header { background:#fff; border-bottom:1px solid #eee; }
  .nav { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:0.5rem 1rem }
  .logo { font-weight:600; color:#111; text-decoration:none }
  .links a { margin-left:1rem; color:#333; text-decoration:none }
  .main-content { max-width:1100px; margin:1rem auto; padding:0 1rem }
</style>

<header class="site-header">
  <nav class="nav">
    <a  class="logo">ecom</a>
    <div class="links">
      <!-- <a routerLink="/cart">Cart</a> -->
      <ng-container *ngIf="isLoggedIn(); else anonLinks">
        <a (click)="logout()" style="cursor:pointer; margin-left:1rem">Logout</a>
      </ng-container>
      <ng-template #anonLinks>
        <a routerLink="/signin">Sign In</a>
        <a routerLink="/signup">Sign Up</a>
      </ng-template>
    </div>
  </nav>
</header>

<main class="main-content">
  <router-outlet></router-outlet>
</main>
  `,
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('ecom');
  constructor(private auth: AuthService, private router: Router) {}

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  async logout() {
    const result = await Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout? You will be redirected to the sign in page.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.auth.logout();
    }
  }
}
