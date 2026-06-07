
const express = require('express');
const router  = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sanitiseText } = require('../middleware/validation');

router.use(requireAuth);


router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*,
           COUNT(t.id) AS task_count,
           SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) AS done_count
    FROM categories c
    LEFT JOIN tasks t ON t.category_id = c.id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.name COLLATE NOCASE ASC
  `).all(req.session.userId);
  res.json(rows);
});


router.post('/', (req, res) => {
  const name  = sanitiseText(req.body.name || '');
  const color = (req.body.color && /^#[0-9a-fA-F]{6}$/.test(req.body.color)) ? req.body.color : '#888888';
  if (!name) return res.status(400).json({ error: 'Nosaukums ir obligāts' });
  if (name.length > 50) return res.status(400).json({ error: 'Nosaukums pārāk garš' });

  const info = db.prepare(
    'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)'
  ).run(req.session.userId, name, color);
  res.json({ id: info.lastInsertRowid });
});


router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const fields = [], values = [];
  if (req.body.name) {
    const n = sanitiseText(req.body.name);
    if (n.length > 50) return res.status(400).json({ error: 'Nosaukums pārāk garš' });
    fields.push('name = ?'); values.push(n);
  }
  if (req.body.color && /^#[0-9a-fA-F]{6}$/.test(req.body.color)) {
    fields.push('color = ?'); values.push(req.body.color);
  }
  if (!fields.length) return res.status(400).json({ error: 'Nav datu' });
  values.push(id, req.session.userId);
  const info = db.prepare(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
  ).run(...values);
  if (!info.changes) return res.status(404).json({ error: 'Nav atrasts' });
  res.json({ ok: true });
});


router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, req.session.userId);
  if (!info.changes) return res.status(404).json({ error: 'Nav atrasts' });
  res.json({ ok: true });
});

module.exports = router;
