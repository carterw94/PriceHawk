const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { queryOne, run } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /auth/register — create a new user account
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // queryOne uses a parameterised query — immune to SQL injection
  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.trim()]);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { lastInsertRowid } = run(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    [email.trim().toLowerCase(), hash, 'user']
  );

  const user = queryOne('SELECT id, email, role FROM users WHERE id = ?', [lastInsertRowid]);
  res.status(201).json({ token: makeToken(user), user });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = queryOne('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);

  // Compare against hash even if user doesn't exist (prevents timing attacks)
  const dummyHash = '$2b$12$invalidhashfortimingattackprevention000000000000000000';
  const valid = await bcrypt.compare(password, user?.password_hash || dummyHash);

  if (!user || !valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password_hash, ...safeUser } = user;
  res.json({ token: makeToken(safeUser), user: safeUser });
});

// GET /auth/me — get current user info
router.get('/me', requireAuth, (req, res) => {
  const user = queryOne('SELECT id, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /auth/users — admin only: list all users
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = require('../db/database').query(
    'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(users);
});

module.exports = router;