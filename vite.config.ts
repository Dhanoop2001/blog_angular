import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      // Development-only CSP to allow Vite HMR blob scripts, inline styles, and external images.
      'Content-Security-Policy': "default-src 'self' data: blob:; script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' blob: 'unsafe-inline'; script-src-elem 'self' blob: 'unsafe-inline'; style-src 'self' 'unsafe-inline' blob: data: https://fonts.googleapis.com; font-src 'self' data: blob: https://fonts.gstatic.com; img-src 'self' data: blob: https:;"
    }
  }
});
