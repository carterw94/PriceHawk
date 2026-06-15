const cron = require('node-cron');
const { query, run } = require('./db/database');
const { scrapeProduct } = require('./scraper/scraper');

let task = null;

async function scrapeAll() {
  const products = query('SELECT * FROM products');
  console.log(`[Scheduler] Scraping ${products.length} product(s)...`);

  for (const product of products) {
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
        console.log(`[Scheduler] ✓ ${product.name}: ${scraped.currency} ${scraped.price}`);
      } else {
        console.warn(`[Scheduler] ⚠ ${product.name}: could not parse price`);
      }
    } catch (err) {
      console.error(`[Scheduler] ✗ ${product.name}: ${err.message}`);
    }
  }

  console.log('[Scheduler] Done.');
}

function startScheduler(intervalMinutes = 60) {
  if (task) task.stop();
  const cronExpr = `*/${intervalMinutes} * * * *`;
  console.log(`[Scheduler] Starting — runs every ${intervalMinutes} minute(s)`);
  task = cron.schedule(cronExpr, scrapeAll);
}

module.exports = { startScheduler, scrapeAll };
