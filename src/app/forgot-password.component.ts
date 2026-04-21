import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'forgot-password-page',
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<section class="auth">
  <div class="auth-card">
    <div class="brand">
      <div class="logo" *ngIf="step === 'email'">FORGOT PASSWORD</div>
      <div class="logo" *ngIf="step === 'done'">CHECK YOUR EMAIL</div>
      <div class="logo" *ngIf="step === 'reset'">RESET PASSWORD</div>
      <p class="subtitle" *ngIf="step === 'email'">We will email you a link to choose a new password.</p>
    </div>

    <div *ngIf="step === 'email'" class="form">
      <div class="field">
        <label class="label">Email</label>
        <input
          class="input"
          [(ngModel)]="email"
          name="fpEmailStep"
          type="email"
          placeholder="you@example.com"
          required
          email
          #emailInput="ngModel"
        />
      </div>
      <div class="error" *ngIf="emailInput.invalid && (emailInput.dirty || emailInput.touched)">
        <div *ngIf="emailInput.errors?.['required']">Email is required.</div>
        <div *ngIf="emailInput.errors?.['email']">Please enter a valid email address.</div>
      </div>
      <div class="error" *ngIf="error">{{ error }}</div>
      <div class="actions" style="flex-direction: column; align-items: stretch">
        <button
          type="button"
          class="btn primary"
          (click)="requestResetLink()"
          [disabled]="loading || emailInput.invalid"
        >
          Send reset link
        </button>
      </div>
      <p style="margin-top: 1rem; text-align: center">
        <a class="link" routerLink="/signin">Back to sign in</a>
      </p>
    </div>

    <div *ngIf="step === 'done'" class="form">
      <p class="subtitle" style="text-align: center; margin-bottom: 1rem">
        If an account exists for that email, we have sent a reset link. Check inbox and spam. If the link contains
        <code style="font-size: 0.75em">localhost</code>, open it on the same PC where the app runs, or set
        <code style="font-size: 0.75em">PUBLIC_APP_URL</code> in the server <code style="font-size: 0.75em">.env</code>
        for a real site address.
      </p>
      <div class="actions" style="flex-direction: column; align-items: stretch">
        <button type="button" class="btn primary" routerLink="/signin">Back to sign in</button>
      </div>
    </div>

    <div *ngIf="step === 'reset'" class="form">
      <p class="subtitle" style="margin-bottom: 1rem">Signed in as <strong>{{ email }}</strong>. Choose a new password.</p>
      <div class="field">
        <label class="label">New password</label>
        <input class="input" [(ngModel)]="newPassword" name="fpNewPwd" type="password" required #newPwd="ngModel" />
      </div>
      <div *ngIf="newPwd.invalid && (newPwd.dirty || newPwd.touched)" class="error">
        <div *ngIf="newPwd.errors?.['required']">Password is required.</div>
      </div>
      <div class="field">
        <label class="label">Confirm password</label>
        <input class="input" [(ngModel)]="confirmPassword" name="fpConfirmPwd" type="password" required #confirmPwd="ngModel" />
      </div>
      <div *ngIf="confirmPwd.invalid && (confirmPwd.dirty || confirmPwd.touched)" class="error">
        <div *ngIf="confirmPwd.errors?.['required']">Please confirm your password.</div>
      </div>
      <div *ngIf="newPassword && confirmPassword && newPassword !== confirmPassword" class="error">
        Passwords do not match.
      </div>
      <div class="error" *ngIf="error">{{ error }}</div>
      <div class="actions" style="flex-direction: column; align-items: stretch; gap: 0.5rem">
        <button
          type="button"
          class="btn primary"
          (click)="submitNewPassword()"
          [disabled]="loading || newPwd.invalid || confirmPwd.invalid || newPassword !== confirmPassword"
        >
          Set password
        </button>
        <button type="button" class="btn" style="background: transparent; color: #8a7048" routerLink="/forgot-password">
          Request a new link
        </button>
      </div>
    </div>
  </div>
</section>
  `,
  styleUrls: ['./signin.css'],
})
export class ForgotPasswordComponent implements OnInit {
  step: 'email' | 'done' | 'reset' = 'email';
  email = '';
  resetToken = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const token = params.get('resetToken')?.trim();
      const mail = params.get('email')?.trim().toLowerCase();
      if (token && mail) {
        this.resetToken = token;
        this.email = mail;
        this.step = 'reset';
        this.error = '';
      }
    });
  }

  private apiBase(): string {
    return typeof window !== 'undefined' && window.location?.hostname === 'localhost'
      ? 'http://localhost:3001'
      : '';
  }

  async requestResetLink() {
    this.email = this.email.trim().toLowerCase();
    if (!this.email) {
      this.error = 'Email is required';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      const base = this.apiBase();
      const url = base ? `${base}/api/forgot-password/request` : '/api/forgot-password/request';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('[forgot-password] API body (same as Network → Response):', data);
      }
      if (!res.ok) {
        this.error = data.message || 'Failed to send reset link';
        return;
      }

      if (data.resetToken) {
        this.resetToken = data.resetToken;
        this.step = 'reset';
        const err = (data as { smtpError?: string }).smtpError;
        if (err) {
          this.error = `Could not send email (dev fallback). SMTP: ${err}`;
        }
      } else if (data._debug?.outcome === 'no_user_registered') {
        this.error =
          data._debug.hint || 'No account uses this email — nothing was sent. Sign up first or fix the address.';
      } else {
        this.step = 'done';
      }
    } catch (e) {
      this.error = (e as Error)?.message || String(e);
    } finally {
      this.loading = false;
    }
  }

  async submitNewPassword() {
    this.email = this.email.trim().toLowerCase();
    this.newPassword = this.newPassword.trim();
    this.confirmPassword = this.confirmPassword.trim();

    if (!this.email || !this.resetToken) {
      this.error = 'Missing reset email or token. Open the link from your email or request a new reset.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.error = 'New password must be at least 8 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.error = '';
    try {
      const base = this.apiBase();
      const url = base ? `${base}/api/forgot-password/reset` : '/api/forgot-password/reset';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          resetToken: this.resetToken,
          newPassword: this.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.error = data.message || `Failed to reset password (${res.status})`;
        return;
      }
      await this.router.navigate(['/signin'], { queryParams: { resetDone: '1' } });
    } catch (e) {
      this.error = (e as Error)?.message || String(e);
    } finally {
      this.loading = false;
    }
  }
}
