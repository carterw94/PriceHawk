const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/pricehawk.db');
let _db = null;

async function initDb() {
  if (_db) return;

  const SQL = await initSqlJs();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _createSchema();
  _migrate();
  _persist();
}

function _persist() {
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── Query helpers ─────────────────────────────────────────────────────────────
// All queries use parameterised ? placeholders — never string concatenation.
// This makes SQL injection impossible regardless of what the user sends.

function query(sql, params = []) {
  const result = _db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

function queryOne(sql, params = []) {
  return query(sql, params)[0];
}

function run(sql, params = []) {
  _db.run(sql, params);
  const changes = _db.getRowsModified();
  const lastInsertRowid = queryOne('SELECT last_insert_rowid() AS id').id;
  _persist();
  return { changes, lastInsertRowid };
}

// ── Schema ────────────────────────────────────────────────────────────────────
function _createSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name             TEXT NOT NULL,
      url              TEXT NOT NULL,
      selector_price   TEXT NOT NULL,
      selector_title   TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      last_scraped_at  TEXT
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS price_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      price      REAL NOT NULL,
      currency   TEXT NOT NULL DEFAULT 'USD',
      in_stock   INTEGER NOT NULL DEFAULT 1,
      scraped_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE INDEX IF NOT EXISTS idx_price_history_product
      ON price_history(product_id, scraped_at DESC)
  `);

  _db.run(`
    CREATE INDEX IF NOT EXISTS idx_products_user
      ON products(user_id)
  `);
}

// ── Migration: add user_id to existing products table if missing ───────────────
function _migrate() {
  try {
    _db.run(`ALTER TABLE products ADD COLUMN user_id INTEGER REFERENCES users(id)`);
    console.log('[DB] Migration: added user_id column to products');
  } catch (_) {
    // Column already exists — no action needed
  }
}

module.exports = { initDb, query, queryOne, run };