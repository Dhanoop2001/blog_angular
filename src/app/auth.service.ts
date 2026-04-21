import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly KEY = 'auth_token';
  constructor(private router: Router) {}

  setToken(token: string) {
    try { localStorage.setItem(this.KEY, token); } catch {}
    try { this.router.navigate(['/home']); } catch {}
  }

  getToken(): string | null {
    try { return localStorage.getItem(this.KEY); } catch { return null; }
  }

  removeToken() {
    try { localStorage.removeItem(this.KEY); } catch {}
  }

  isLoggedIn(): boolean {
    try { return !!localStorage.getItem(this.KEY); } catch { return false; }
  }

  logout() {
    this.removeToken();
    this.router.navigate(['/signin']);
  }
}
