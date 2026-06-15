require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db/database');
const { startScheduler } = require('./scheduler');
const routes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3001;
const SCRAPE_INTERVAL = parseInt(process.env.SCRAPE_INTERVAL_MINUTES || '60', 10);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use('/api/products/:id/scrape', rateLimit({ windowMs: 60 * 1000, max: 3 }));
app.use(express.json());

// ── API key authentication ────────────────────────────────────────────────────
// If API_KEY is set in .env, every /api request must include the header:
//   x-api-key: <your key>
// If API_KEY is not set, the check is skipped (useful during local dev).
app.use('/api', (req, res, next) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next(); // no key configured — open in dev
  if (req.headers['x-api-key'] !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', routes);
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

// ── Boot: init DB first, then start listening ─────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🦅 PriceHawk API listening on http://localhost:${PORT}`);
      startScheduler(SCRAPE_INTERVAL);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });