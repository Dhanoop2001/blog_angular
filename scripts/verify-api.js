// Simple verification script for the demo API
// Usage: node scripts/verify-api.js

async function run() {
  const base = 'http://localhost:3001';
  try {
    console.log('GET /api/products');
    const pRes = await fetch(`${base}/api/products`);
    const products = await pRes.json();
    console.log('Products count:', products.length);
    if (products.length > 0) console.log('First product:', products[0].title);

    console.log('\nPOST /api/orders');
    const payload = { items: products.slice(0, 2).map(p => ({ id: p.id, qty: 1 })), total: products.slice(0,2).reduce((s,p)=>s+p.price,0) };
    const oRes = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const oJson = await oRes.json();
    console.log('Order response status:', oRes.status);
    console.log('Response body:', oJson);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exitCode = 2;
  }
}

run();
