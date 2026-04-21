# Ecom (Angular + Node Demo)

A small demo e-commerce app built with Angular (frontend) and a minimal Node/Express API (backend).

## Quick start (two terminals)

1. Start the lightweight API server (serves `/api/products` and `/api/orders`):

```bash
# from project root
npm run start:api
```

API runs on http://localhost:3001 by default.

2. Start the Angular development server:

```bash
npm start
```

Angular dev server runs on http://localhost:4200 by default.

## Dev verifier

Run the small verifier script to test the API endpoints:

```bash
node scripts/verify-api.js
```

## Notes
- The backend in `src/server.ts` also exposes the same `/api` endpoints when running the SSR server.
- Sample product data: `src/api/products.json` (uses placeholder images).
- Simple in-memory orders store used for demo purposes.

## Next steps
- Persist orders to a real database.
- Add authentication and payment integration.

## Reference
For more information on Angular CLI commands and workflow, see https://angular.dev/tools/cli

## Production build & serve

Build a production bundle and run the server (SSR) produced by the Angular build:

```bash
# build production artifacts
npm run build:prod

# serve the server bundle (after building)
# this uses the generated server in `dist/` and requires Node.js
npm run serve:ssr:ecom
```

Alternatively, to serve a static browser build (no SSR) you can use a static file server such as `serve`:

```bash
npm run build:prod
npx serve dist/browser -l 8080
```

Notes:
- When using SSR, the `serve:ssr:ecom` script expects the Angular universal build output layout (check `dist/` after build).
- For simple production testing you can also deploy the `dist/browser` folder to any static host.
