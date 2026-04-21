import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService) as AuthService;
  
  const token = authService.getToken();
  if (token) {
    return true;
  }
  
  router.navigate(['/signin']);
  return false;
};
