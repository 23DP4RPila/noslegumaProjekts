// Subtask routes — split tasks into smaller steps (per spec)
const express = require('express');
const router  = express.Router();
const { db, logActivity } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sanitiseText } = require('../middleware/validation');

router.use(requireAuth);

function ownTask(req, taskId) {
  return db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(taskId, req.session.userId);
}


router.get('/', (req, res) => {
  const taskId = parseInt(req.query.task_id, 10);
  if (!taskId || !ownTask(req, taskId)) return res.status(404).json({ error: 'Uzdevums nav atrasts' });
  const rows = db.prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index ASC, id ASC'
  ).all(taskId);
  res.json(rows);
});


router.post('/', (req, res) => {
  const taskId = parseInt(req.body.task_id, 10);
  const title  = sanitiseText(req.body.title || '');
  if (!taskId || !ownTask(req, taskId)) return res.status(404).json({ error: 'Uzdevums nav atrasts' });
  if (!title) return res.status(400).json({ error: 'Apakšuzdevuma virsraksts ir obligāts' });
  if (title.length > 200) return res.status(400).json({ error: 'Virsraksts pārāk garš' });

  const next = db.prepare(
    'SELECT COALESCE(MAX(order_index), 0) + 1 AS n FROM subtasks WHERE task_id = ?'
  ).get(taskId).n;

  const info = db.prepare(
    'INSERT INTO subtasks (task_id, title, order_index) VALUES (?, ?, ?)'
  ).run(taskId, title, next);

  logActivity({ userId: req.session.userId, action: 'subtask_create', targetType: 'subtask', targetId: info.lastInsertRowid, ip: req.ip });
  res.json({ id: info.lastInsertRowid });
});

// PUT /api/subtasks/:id
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const sub = db.prepare(`
    SELECT s.* FROM subtasks s
    JOIN tasks t ON t.id = s.task_id
    WHERE s.id = ? AND t.user_id = ?
  `).get(id, req.session.userId);
  if (!sub) return res.status(404).json({ error: 'Apakšuzdevums nav atrasts' });

  const fields = [];
  const values = [];
  if ('title' in req.body) {
    const t = sanitiseText(req.body.title);
    if (!t) return res.status(400).json({ error: 'Virsraksts ir obligāts' });
    if (t.length > 200) return res.status(400).json({ error: 'Virsraksts pārāk garš' });
    fields.push('title = ?'); values.push(t);
  }
  if ('completed' in req.body) {
    fields.push('completed = ?'); values.push(req.body.completed ? 1 : 0);
  }
  if (!fields.length) return res.status(400).json({ error: 'Nav datu' });
  values.push(id);
  db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});


router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare(`
    DELETE FROM subtasks WHERE id = ? AND task_id IN (SELECT id FROM tasks WHERE user_id = ?)
  `).run(id, req.session.userId);
  if (!info.changes) return res.status(404).json({ error: 'Nav atrasts' });
  res.json({ ok: true });
});

module.exports = router;
