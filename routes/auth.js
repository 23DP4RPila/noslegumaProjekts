const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();

const { db, logActivity } = require('../db');
const { validateRegistration, validateLogin, sanitiseText } = require('../middleware/validation');


router.post('/register', (req, res) => {
  const errors = validateRegistration(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const username = sanitiseText(req.body.username);
  const email    = String(req.body.email).toLowerCase().trim();
  const password = req.body.password;

  const exists = db.prepare(
    'SELECT 1 FROM users WHERE email = ? OR username = ?'
  ).get(email, username);
  if (exists) return res.status(409).json({ error: 'Lietotājs ar šādu e-pastu vai lietotājvārdu jau eksistē' });

  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare(`
    INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)
  `).run(username, email, hash);

  req.session.userId   = info.lastInsertRowid;
  req.session.username = username;
  req.session.role     = 'user';

  logActivity({ userId: info.lastInsertRowid, action: 'register', ip: req.ip });
  res.json({ id: info.lastInsertRowid, username, email, role: 'user' });
});


router.post('/login', (req, res) => {
  const errors = validateLogin(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const email = String(req.body.email).toLowerCase().trim();
  const user  = db.prepare(
    'SELECT id, username, email, password_hash, role, is_active FROM users WHERE email = ?'
  ).get(email);

  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Nepareizs e-pasts vai parole' });
  }
  const ok = bcrypt.compareSync(req.body.password, user.password_hash);
  if (!ok) {
    logActivity({ userId: user.id, action: 'login_failed', ip: req.ip });
    return res.status(401).json({ error: 'Nepareizs e-pasts vai parole' });
  }


  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Sesijas kļūda' });
    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.role     = user.role;
    logActivity({ userId: user.id, action: 'login', ip: req.ip });
    res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
  });
});


router.post('/logout', (req, res) => {
  const uid = req.session?.userId;
  req.session.destroy(() => {
    if (uid) logActivity({ userId: uid, action: 'logout', ip: req.ip });
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});


router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.json({ authenticated: false });
  const u = db.prepare(
    'SELECT id, username, email, role, description, created_at FROM users WHERE id = ?'
  ).get(req.session.userId);
  if (!u) return res.json({ authenticated: false });
  res.json({ authenticated: true, user: u });
});


router.put('/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Nepieciešama autentifikācija' });
  const { username, email, description, password } = req.body || {};
  const updates = [];
  const values  = [];

  if (username) {
    if (!/^[a-zA-Z0-9_\-\.]{3,30}$/.test(username))
      return res.status(400).json({ error: 'Nederīgs lietotājvārds' });
    updates.push('username = ?'); values.push(sanitiseText(username));
  }
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Nederīgs e-pasts' });
    updates.push('email = ?'); values.push(String(email).toLowerCase().trim());
  }
  if (typeof description === 'string') {
    if (description.length > 500) return res.status(400).json({ error: 'Apraksts pārāk garš' });
    updates.push('description = ?'); values.push(sanitiseText(description));
  }
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: 'Parole pārāk īsa' });
    updates.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 12));
  }
  if (!updates.length) return res.status(400).json({ error: 'Nav datu atjaunināšanai' });

  values.push(req.session.userId);
  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE')
      return res.status(409).json({ error: 'Lietotājvārds vai e-pasts jau aizņemts' });
    throw e;
  }
  logActivity({ userId: req.session.userId, action: 'account_update', ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
