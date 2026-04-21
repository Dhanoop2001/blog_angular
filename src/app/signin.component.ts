import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  selector: 'signin-page',
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<section class="auth">
  <div class="auth-card">
    <div class="brand">
      <div class="logo">SIGN IN</div>
    </div>
    <form (ngSubmit)="submit()" class="form" #signinForm="ngForm">
      <div *ngIf="successMessage" class="success-banner">{{ successMessage }}</div>
      <div class="field">
        <label class="label">Email</label>
        <input class="input" [(ngModel)]="email" name="email" type="email" required email #emailInput="ngModel" />
      </div>

      <div *ngIf="emailInput.invalid && (emailInput.dirty || emailInput.touched)" class="error">
        <div *ngIf="emailInput.errors?.['required']">Email is required.</div>
        <div *ngIf="emailInput.errors?.['email']">Please enter a valid email address.</div>
      </div>
      <div class="field">
        <label class="label">Password</label>
        <div class="password-field">
          <input class="input" [(ngModel)]="password" name="password" [type]="showPassword ? 'text' : 'password'"
            required minlength="8"
            pattern="(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}"
            #pwd="ngModel" />
          <button type="button" class="toggle" (click)="togglePassword()" aria-label="Toggle password visibility">
            <svg *ngIf="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg *ngIf="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.54 21.54 0 0 1 5.06-6.06" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 1l22 22" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div *ngIf="pwd.invalid && (pwd.dirty || pwd.touched)" class="error">
        <div *ngIf="pwd.errors?.['required']">Password is required.</div>
        <div *ngIf="pwd.errors?.['minlength']">Password must be at least 8 characters.</div>
        <div *ngIf="pwd.errors?.['pattern']">Password must include uppercase, lowercase, number, and special character.</div>
      </div>

      <div *ngIf="error" class="error">{{ error }}</div>

      <div class="actions">
        <button type="submit" class="btn primary" [disabled]="loading || signinForm.invalid">Sign in</button>
      </div>
      <br>
      <div>
        <p>Don't have an account? <a class="link" routerLink="/signup">SIGN UP</a></p>
        <p><a class="link" routerLink="/forgot-password">Forgot password?</a></p>
      </div>
    </form>
  </div>
</section>
  `,
  styles: [
    `
    .success-banner {
      background: rgba(34, 120, 80, 0.12);
      border: 1px solid rgba(34, 120, 80, 0.35);
      color: #1e5a40;
      font-size: 0.8rem;
      padding: 0.65rem 0.85rem;
      margin-bottom: 1rem;
      border-radius: 2px;
      letter-spacing: 0.02em;
    }
    `,
  ],
  styleUrls: ['./signin.css'],
})
export class SigninComponent implements OnInit {
  email = '';
  password = '';
  loading = false;
  error = '';
  successMessage = '';
  showPassword = false;

  constructor(private router: Router, private route: ActivatedRoute, private auth: AuthService) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('resetDone') === '1') {
        this.successMessage = 'Password updated. Sign in with your new password.';
      }
    });
  }

  async submit() {
    this.email = this.email.trim().toLowerCase();
    this.password = this.password.trim();

    this.loading = true;
    this.error = '';
    this.successMessage = '';
    try {
      const base =
        typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost'
          ? 'http://localhost:3001'
          : '';
      const url = base ? `${base}/api/signin` : '/api/signin';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.error = data.message || 'Signin failed';
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data && data.token) {
        this.auth.setToken(data.token);
        return;
      }
      this.router.navigateByUrl('/home');
    } catch (e) {
      this.error = (e as Error)?.message || String(e);
    } finally {
      this.loading = false;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
