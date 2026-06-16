const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Find an installed browser on the system to avoid needing a Puppeteer download.
 * Checks common Chrome and Edge paths on Windows.
 */
function findSystemBrowser() {
  const candidates = [
    // Chrome (user install)
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // Chrome (system install)
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Edge (always present on Windows 10/11)
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

/**
 * Parse a price string like "$12.99", "12,99 €", "1,234.56" → float
 */
function parsePrice(raw) {
  if (!raw) return null;
  // Remove everything except digits, dots, commas
  const cleaned = raw.replace(/[^\d.,]/g, '');
  // Handle "1,234.56" vs "1.234,56" (European)
  const normalized = cleaned.replace(/,(\d{3})/g, '$1').replace(',', '.');
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

/**
 * Detect currency symbol from raw price string
 */
function detectCurrency(raw) {
  if (!raw) return 'USD';
  if (raw.includes('€')) return 'EUR';
  if (raw.includes('£')) return 'GBP';
  if (raw.includes('¥')) return 'JPY';
  return 'USD';
}

/**
 * Scrape a single product page.
 * @param {string} url
 * @param {string} priceSelector  CSS selector for the price element
 * @param {string} [titleSelector] CSS selector for the title (optional)
 * @returns {{ price: number|null, currency: string, title: string|null, inStock: boolean }}
 */
async function scrapeProduct(url, priceSelector, titleSelector) {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || findSystemBrowser();
  if (executablePath) {
    console.log(`[Scraper] Using browser: ${executablePath}`);
  } else {
    console.log('[Scraper] No system browser found, using Puppeteer bundled browser');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      `--window-size=${1200 + Math.floor(Math.random() * 200)},${800 + Math.floor(Math.random() * 100)}`,
    ],
  });

  try {
    const page = await browser.newPage();

    // Hide automation signals
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Spoof a real browser UA
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // Block images/fonts/media to speed up scraping
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for price element (up to 5s)
    try {
      await page.waitForSelector(priceSelector, { timeout: 5000 });
    } catch (_) {
      // Selector didn't appear — page may have loaded differently
    }

    const result = await page.evaluate(
      (pSel, tSel) => {
        const priceEl = document.querySelector(pSel);
        const titleEl = tSel ? document.querySelector(tSel) : null;

        // In-stock detection: prefer positive signals over scanning full body text
        // (body text scan produces false positives on Amazon/large sites where
        // "unavailable" appears in Q&A, related products, seller listings, etc.)
        const positiveSelectors = [
          '#add-to-cart-button',       // Amazon
          '#buy-now-button',           // Amazon
          '.add-to-basket',            // generic
          '[data-action="add-to-cart"]',
          'button[name="add"]',        // Shopify
        ];
        const hasAddToCart = positiveSelectors.some(s => !!document.querySelector(s));

        // Also check the dedicated availability element if present (Amazon #availability)
        const availabilityEl = document.querySelector('#availability, .availability, [class*="stock"]');
        const availabilityText = availabilityEl ? availabilityEl.innerText.toLowerCase() : '';

        let inStock;
        if (hasAddToCart) {
          inStock = true;
        } else if (availabilityText) {
          inStock = availabilityText.includes('in stock') || availabilityText.includes('available');
        } else {
          // Last resort: narrow body scan (just first 2000 chars to avoid footer/Q&A noise)
          const topText = document.body.innerText.slice(0, 2000).toLowerCase();
          const outOfStockPhrases = ['out of stock', 'sold out', 'currently unavailable'];
          inStock = !outOfStockPhrases.some(p => topText.includes(p));
        }

        return {
          rawPrice: priceEl ? priceEl.innerText.trim() : null,
          title: titleEl ? titleEl.innerText.trim() : document.title,
          inStock,
        };
      },
      priceSelector,
      titleSelector || null
    );

    return {
      price: parsePrice(result.rawPrice),
      currency: detectCurrency(result.rawPrice),
      title: result.title,
      inStock: result.inStock,
      rawPrice: result.rawPrice,
    };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeProduct };