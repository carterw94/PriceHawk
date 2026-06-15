require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const { initDb, queryOne, run } = require('./db/database');
const { startScheduler } = require('./scheduler');
const routes = require('./api/routes');
const authRoutes = require('./api/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const SCRAPE_INTERVAL = parseInt(process.env.SCRAPE_INTERVAL_MINUTES || '60', 10);

// ── Security middleware ───────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const production = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (
      !origin ||
      origin === 'http://localhost:5173' ||
      origin === production ||
      /https:\/\/pricehawk[^.]*\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use('/api/products/:id/scrape', rateLimit({ windowMs: 60 * 1000, max: 3 }));
app.use(express.json());

// ── API key check (static key for machine-level access) ───────────────────────
app.use('/api', (req, res, next) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next();
  if (req.headers['x-api-key'] !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api', routes);
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

// ── Seed admin account from .env ──────────────────────────────────────────────
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const exists = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (exists) return;

  const hash = await bcrypt.hash(password, 12);
  run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    [email.toLowerCase(), hash, 'admin']);
  console.log(`[Admin] Seeded admin account: ${email}`);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
initDb()
  .then(seedAdmin)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🦅 PriceHawk API listening on http://localhost:${PORT}`);
      startScheduler(SCRAPE_INTERVAL);
    });
  })
  .catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
  });