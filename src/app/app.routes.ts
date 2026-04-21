import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'signup',
		pathMatch: 'full',
	},
	{
		path: 'home',
		loadComponent: () => import('./home-page.component').then((m) => m.HomePage),
		// canActivate: [authGuard],
	},
	{
		path: 'blogs',
		loadComponent: () => import('./blog-listing.component').then((m) => m.BlogListing),
	},
	{
		path: 'product/:id',
		loadComponent: () => import('./product-detail.component').then((m) => m.ProductDetail),
	},
	{
		path: 'cart',
		loadComponent: () => import('./cart.component').then((m) => m.CartComponent),
	},
	{
		path: 'signup',
		loadComponent: () => import('./signup.component').then((m) => m.SignupComponent),
	},
	{
		path: 'signin',
		loadComponent: () => import('./signin.component').then((m) => m.SigninComponent),
	},
	{
		path: 'forgot-password',
		loadComponent: () => import('./forgot-password.component').then((m) => m.ForgotPasswordComponent),
	},
];

