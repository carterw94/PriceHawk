# 🦅 PriceHawk

A full-stack e-commerce price tracker. Add any product URL, configure the CSS selector for the price element, and PriceHawk scrapes and stores the price on a schedule — visualizing the history on a live dashboard.

![Dashboard screenshot](docs/screenshot.png)

## Features

- **Headless browser scraping** via Puppeteer with anti-detection headers and resource blocking for speed
- **Price history** stored in SQLite with WAL mode for concurrent reads
- **Interactive dashboard** built with React + Recharts — area charts, price delta badges, in-stock indicators
- **Scheduled auto-scraping** via node-cron (configurable interval)
- **Manual refresh** per product with per-endpoint rate limiting
- **REST API** with Helmet security headers, CORS, and global rate limiting
- Works on any site — supply a CSS selector for the price element

## Tech Stack

| Layer | Technology |
|---|---|
| Scraper | Puppeteer (headless Chromium) |
| Backend | Node.js, Express, node-cron |
| Database | SQLite (better-sqlite3, WAL mode) |
| Frontend | React 18, Vite, Recharts |
| Styling | CSS Modules |

## Project Structure

```
pricehawk/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app + middleware
│   │   ├── scheduler.js       # node-cron scrape loop
│   │   ├── api/
│   │   │   └── routes.js      # REST endpoints
│   │   ├── db/
│   │   │   └── database.js    # SQLite init + schema
│   │   └── scraper/
│   │       └── scraper.js     # Puppeteer scraper + price parser
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js             # Axios API client
    │   └── components/
    │       ├── Navbar.jsx
    │       ├── StatsBar.jsx
    │       ├── ProductCard.jsx
    │       ├── AddProductModal.jsx
    │       └── PriceChartModal.jsx
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/pricehawk.git
cd pricehawk
```

### 2. Start the backend

```bash
cd backend
npm install
cp .env.example .env   # edit PORT / SCRAPE_INTERVAL_MINUTES if needed
npm run dev
# API running at http://localhost:3001
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
# UI running at http://localhost:5173
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List all products with latest price |
| `POST` | `/api/products` | Add a product to track |
| `DELETE` | `/api/products/:id` | Stop tracking a product |
| `GET` | `/api/products/:id/history` | Price history (query: `?limit=60`) |
| `POST` | `/api/products/:id/scrape` | Trigger a manual scrape |
| `GET` | `/api/stats` | Dashboard summary stats |
| `GET` | `/health` | Health check |

### Add product payload

```json
{
  "url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "selector_price": ".price_color",
  "selector_title": ".product_main h1",
  "name": "A Light in the Attic"
}
```

## Finding CSS Selectors

1. Open the product page in Chrome/Firefox
2. Right-click the price → **Inspect**
3. In DevTools, right-click the highlighted element → **Copy → Copy selector**
4. Paste into the "Price CSS Selector" field in the app

## How the Scraper Works

1. Launches a headless Chromium instance via Puppeteer
2. Spoofs a real browser User-Agent and `Accept-Language` header
3. Blocks images, fonts, stylesheets, and media to cut load time by ~70%
4. Waits for the price element to appear in the DOM (up to 5s)
5. Extracts and normalises the price string (handles `$`, `€`, `£`, comma-separated thousands)
6. Detects out-of-stock by scanning body text for common phrases
7. Persists the result to SQLite and closes the browser

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `SCRAPE_INTERVAL_MINUTES` | `60` | How often to auto-scrape all products |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |

## License

MIT
