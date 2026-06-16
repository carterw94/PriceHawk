const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Find an installed browser on the system to avoid needing a Puppeteer download.
 * Checks common Chrome and Edge paths on Windows.
 */
function findSystemBrowser() {
  const candidates = [
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

function parsePrice(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const normalized = cleaned.replace(/,(\d{3})/g, '$1').replace(',', '.');
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

function detectCurrency(raw) {
  if (!raw) return 'USD';
  if (raw.includes('€')) return 'EUR';
  if (raw.includes('£')) return 'GBP';
  if (raw.includes('¥')) return 'JPY';
  return 'USD';
}

async function scrapeProduct(url, priceSelector, titleSelector) {
  const executablePath = findSystemBrowser();
  if (executablePath) {
    console.log(`[Scraper] Using system browser: ${executablePath}`);
  } else {
    console.log('[Scraper] No system browser found, using Puppeteer bundled browser');
  }

  const isLinux = !executablePath;
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      ...(isLinux ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--window-size=${1200 + Math.floor(Math.random() * 200)},${800 + Math.floor(Math.random() * 100)}`,
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

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

    try {
      await page.waitForSelector(priceSelector, { timeout: 5000 });
    } catch (_) {}

    const result = await page.evaluate(
      (pSel, tSel) => {
        const priceEl = document.querySelector(pSel);
        const titleEl = tSel ? document.querySelector(tSel) : null;

        const positiveSelectors = [
          '#add-to-cart-button',
          '#buy-now-button',
          '.add-to-basket',
          '[data-action="add-to-cart"]',
          'button[name="add"]',
        ];
        const hasAddToCart = positiveSelectors.some(s => !!document.querySelector(s));

        const availabilityEl = document.querySelector('#availability, .availability, [class*="stock"]');
        const availabilityText = availabilityEl ? availabilityEl.innerText.toLowerCase() : '';

        let inStock;
        if (hasAddToCart) {
          inStock = true;
        } else if (availabilityText) {
          inStock = availabilityText.includes('in stock') || availabilityText.includes('available');
        } else {
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