import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  selector: 'signup-page',
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<section class="auth">
  <div class="auth-card">
    <div class="brand">
      <div class="logo">SIGN UP</div>
    </div>
    <form (ngSubmit)="submit()" class="form" #signupForm="ngForm">
      <div class="field">
        <label class="label">Name</label>
        <input class="input" [(ngModel)]="name" (ngModelChange)="handleNameChange($event)" name="name" required minlength="2" maxlength="50" pattern="^[a-zA-Z\s]+$" #nameInput="ngModel" />
      </div>
      <div *ngIf="nameInput.invalid && (nameInput.dirty || nameInput.touched)" class="error">
        <div *ngIf="nameInput.errors?.['required']">Name is required.</div>
        <div *ngIf="nameInput.errors?.['minlength']">Name must be at least 2 characters.</div>
        <div *ngIf="nameInput.errors?.['maxlength']">Name must be less than 50 characters.</div>
        <div *ngIf="nameInput.errors?.['pattern']">Name can only contain letters and spaces.</div>
      </div>
      <div class="field">
        <label class="label">Email</label>
        <input class="input" [(ngModel)]="email" (ngModelChange)="handleEmailChange($event)" name="email" type="email" required email #emailInput="ngModel" />
      </div>
      <div *ngIf="emailInput.invalid && (emailInput.dirty || emailInput.touched)" class="error">
        <div *ngIf="emailInput.errors?.['required']">Email is required.</div>
        <div *ngIf="emailInput.errors?.['email']">Please enter a valid email address.</div>
      </div>
      <div class="field">
        <label class="label">Password</label>
        <div class="password-field">
          <input class="input" [(ngModel)]="password" (ngModelChange)="handlePasswordChange($event)" name="password" [type]="showPassword ? 'text' : 'password'"
            required minlength="8" pattern="(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}" #pwd="ngModel" />
          <button type="button" class="toggle" (click)="togglePassword()" aria-label="Toggle password visibility">
            <svg *ngIf="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg *ngIf="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.54 21.54 0 0 1 5.06-6.06" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 1l22 22" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div class="field">
        <label class="label">Confirm Password</label>
        <input class="input" [(ngModel)]="confirmPassword" (ngModelChange)="handleConfirmPasswordChange($event)" name="confirmPassword" [type]="showPassword ? 'text' : 'password'" required #confirmPwd="ngModel" />
      </div>

      <div *ngIf="confirmPwd.invalid && (confirmPwd.dirty || confirmPwd.touched)" class="error">
        <div *ngIf="confirmPwd.errors?.['required']">Please confirm your password.</div>
      </div>

      <div *ngIf="password && confirmPassword && password !== confirmPassword" class="error">
        Passwords do not match.
      </div>

      <div *ngIf="pwd.invalid && (pwd.dirty || pwd.touched)" class="error">
        <div *ngIf="pwd.errors?.['required']">Password is required.</div>
        <div *ngIf="pwd.errors?.['minlength']">Password must be at least 8 characters.</div>
        <div *ngIf="pwd.errors?.['pattern']">Password must include uppercase, lowercase, number, and special character.</div>
      </div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <div class="actions">
        <button type="submit" class="btn primary" [disabled]="loading || signupForm.invalid">
          <span *ngIf="!loading">Create account</span>
          <span *ngIf="loading" class="spinner">Loading...</span>
        </button>
      </div>
      <br>
      <div>
         <p>Already have an account? <a class="link" routerLink="/signin">SIGN IN</a></p>
      </div>
    </form>
  </div>
</section>
  `,
  styleUrls: ['./signup.css'],
})
export class SignupComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  error = '';
  showSignin = false;
  showPassword = false;

  constructor(private router: Router, private auth: AuthService) {}

  async submit() {
    this.loading = true;
    this.error = '';
    try {
      const base = (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') ? 'http://localhost:3001' : '';
      const url = base ? `${base}/api/signup` : '/api/signup';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name, email: this.email, password: this.password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.error = data.message || 'Signup failed';
        if (res.status === 409) this.showSignin = true;
        return;
      }
      // on success: redirect user to sign-in page
      this.showSignin = false;
      this.router.navigateByUrl('/signin');
      return;
    } catch (e) {
      this.error = (e as any)?.message || String(e);
    } finally {
      this.loading = false;
    }
  }

  handleNameChange(value: string) {
    this.name = (value ?? '').trimStart();
  }

  handleEmailChange(value: string) {
    this.email = (value ?? '').trimStart();
  }

  handlePasswordChange(value: string) {
    this.password = (value ?? '').trimStart();
  }

  handleConfirmPasswordChange(value: string) {
    this.confirmPassword = (value ?? '').trimStart();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
