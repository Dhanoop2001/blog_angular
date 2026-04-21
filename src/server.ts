import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Enable JSON body parsing for API endpoints
app.use(express.json());

// Serve static assets from `src/assets` at the `/assets` path during development
app.use('/assets', express.static(join(process.cwd(), 'src', 'assets')));

// Provide a single fallback image at `/assets/images/image.jpg` that returns
// the local SVG placeholder so clients can reference a single image name.
app.get('/assets/images/image.jpg', (req, res) => {
  const fallback = join(process.cwd(), 'src', 'assets', 'images', 'white-tshirt.svg');
  res.type('image/svg+xml');
  res.sendFile(fallback);
});

// Load sample product data for the demo API
import * as fs from 'node:fs';
// Use project root to reliably locate the `src/api/products.json` file during
// development and production regardless of where the compiled module is executed.
const productsPath = join(process.cwd(), 'src', 'api', 'products.json');
let products: any[] = [];
try {
  console.log('Resolving products.json at', productsPath);
  console.log('products.json exists:', fs.existsSync(productsPath));
  const raw = fs.readFileSync(productsPath, 'utf-8');
  products = JSON.parse(raw);
} catch (e) {
  console.warn('Could not load products.json, starting with empty product list.', (e as any)?.message || e);
}

// Simple in-memory orders store for demo purposes
const orders: any[] = [];

// API endpoints
app.get('/api/products', (req, res) => {
  return res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) return res.status(404).json({ message: 'Product not found' });
  return res.json(p);
});

app.post('/api/orders', (req, res) => {
  const order = req.body;
  if (!order || !order.items || !Array.isArray(order.items)) {
    return res.status(400).json({ message: 'Invalid order payload' });
  }
  const newOrder = {
    id: orders.length + 1,
    items: order.items,
    total: order.total || 0,
    createdAt: new Date().toISOString(),
  };
  orders.push(newOrder);
  return res.status(201).json({ orderId: newOrder.id });
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
