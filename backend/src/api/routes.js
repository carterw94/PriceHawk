const express = require('express');
const { query, queryOne, run } = require('../db/database');
const { scrapeProduct } = require('../scraper/scraper');

const router = express.Router();

// ─── Products ────────────────────────────────────────────────────────────────

// GET /api/products — list all tracked products with latest price
router.get('/products', (req, res) => {
  const products = query(`
    SELECT
      p.*,
      ph.price      AS current_price,
      ph.currency   AS currency,
      ph.in_stock   AS in_stock,
      ph.scraped_at AS last_price_at,
      (
        SELECT ph2.price
        FROM price_history ph2
        WHERE ph2.product_id = p.id
        ORDER BY ph2.scraped_at DESC
        LIMIT 1 OFFSET 1
      ) AS previous_price
    FROM products p
    LEFT JOIN price_history ph ON ph.id = (
      SELECT id FROM price_history
      WHERE product_id = p.id
      ORDER BY scraped_at DESC
      LIMIT 1
    )
    ORDER BY p.created_at DESC
  `);
  res.json(products);
});

// POST /api/products — add a new product to track
router.post('/products', async (req, res) => {
  const { name, url, selector_price, selector_title } = req.body;
  if (!url || !selector_price) {
    return res.status(400).json({ error: 'url and selector_price are required' });
  }

  const existing = queryOne('SELECT id FROM products WHERE url = ?', [url]);
  if (existing) {
    return res.status(409).json({ error: 'Product with this URL is already tracked' });
  }

  // Initial scrape
  let scraped = {};
  try {
    scraped = await scrapeProduct(url, selector_price, selector_title);
  } catch (err) {
    console.error('Initial scrape failed:', err.message);
  }

  const productName = name || scraped.title || url;

  const { lastInsertRowid } = run(
    `INSERT INTO products (name, url, selector_price, selector_title, last_scraped_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [productName, url, selector_price, selector_title || null]
  );

  if (scraped.price != null) {
    run(
      `INSERT INTO price_history (product_id, price, currency, in_stock)
       VALUES (?, ?, ?, ?)`,
      [lastInsertRowid, scraped.price, scraped.currency, scraped.inStock ? 1 : 0]
    );
  }

  const product = queryOne('SELECT * FROM products WHERE id = ?', [lastInsertRowid]);
  res.status(201).json({ product, scraped });
});

// DELETE /api/products/:id
router.delete('/products/:id', (req, res) => {
  // Manually cascade since sql.js doesn't enforce FK by default
  run('DELETE FROM price_history WHERE product_id = ?', [req.params.id]);
  const { changes } = run('DELETE FROM products WHERE id = ?', [req.params.id]);
  if (changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
});

// ─── Price History ────────────────────────────────────────────────────────────

router.get('/products/:id/history', (req, res) => {
  const limit = Number(req.query.limit) || 100;
  const history = query(
    `SELECT price, currency, in_stock, scraped_at
     FROM price_history
     WHERE product_id = ?
     ORDER BY scraped_at ASC
     LIMIT ?`,
    [req.params.id, limit]
  );
  res.json(history);
});

// ─── Manual Scrape ────────────────────────────────────────────────────────────

router.post('/products/:id/scrape', async (req, res) => {
  const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  try {
    const scraped = await scrapeProduct(
      product.url,
      product.selector_price,
      product.selector_title
    );

    if (scraped.price != null) {
      run(
        `INSERT INTO price_history (product_id, price, currency, in_stock)
         VALUES (?, ?, ?, ?)`,
        [product.id, scraped.price, scraped.currency, scraped.inStock ? 1 : 0]
      );
      run(`UPDATE products SET last_scraped_at = datetime('now') WHERE id = ?`, [product.id]);
    }

    res.json({ success: true, scraped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get('/stats', (req, res) => {
  const { count: totalProducts } = queryOne('SELECT COUNT(*) AS count FROM products');
  const { count: totalScrapes }  = queryOne('SELECT COUNT(*) AS count FROM price_history');
  const { count: priceDrops }    = queryOne(`
    SELECT COUNT(*) AS count FROM (
      SELECT
        ph.product_id, ph.price,
        LAG(ph.price) OVER (PARTITION BY ph.product_id ORDER BY ph.scraped_at) AS prev_price
      FROM price_history ph
    ) WHERE price < prev_price
  `);
  res.json({ totalProducts, totalScrapes, priceDrops });
});

module.exports = router;
