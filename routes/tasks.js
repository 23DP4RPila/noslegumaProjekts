const express = require('express');
const router  = express.Router();
const { db, logActivity } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateTask, sanitiseText } = require('../middleware/validation');

router.use(requireAuth);


router.get('/', (req, res) => {
  const { status, type, search, sort, category_id } = req.query;
  const where = ['t.user_id = ?'];
  const params = [req.session.userId];

  if (status && ['pending', 'done'].includes(status)) {
    where.push('t.status = ?'); params.push(status);
  }
  if (type && ['regular', 'smart'].includes(type)) {
    where.push('t.type = ?'); params.push(type);
  }
  if (category_id) {
    where.push('t.category_id = ?'); params.push(parseInt(category_id, 10));
  }
  if (search) {
    
    where.push('(t.title LIKE ? COLLATE NOCASE OR t.description LIKE ? COLLATE NOCASE OR c.name LIKE ? COLLATE NOCASE)');
    const q = `%${search}%`; params.push(q, q, q);
  }

  const sortMap = {
    'order':    't.order_index ASC, t.id ASC',
    'created':  't.created_at DESC',
    'deadline': "CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END, t.deadline ASC",
    'priority': 't.priority DESC, t.order_index ASC',
    'title':    't.title COLLATE NOCASE ASC',
  };
  const orderBy = sortMap[sort] || sortMap.order;


  const rows = db.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color,
           (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtasks_total,
           (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) AS subtasks_done
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
  `).all(...params);

  res.json(rows);
});


router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = db.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ? AND t.user_id = ?
  `).get(id, req.session.userId);
  if (!task) return res.status(404).json({ error: 'Uzdevums nav atrasts' });

  const subtasks = db.prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index ASC, id ASC'
  ).all(id);
  task.subtasks = subtasks;
  res.json(task);
});


router.get('/current/now', (req, res) => {
  const t = db.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ? AND t.status = 'pending'
    ORDER BY t.order_index ASC, t.id ASC
    LIMIT 1
  `).get(req.session.userId);
  if (!t) return res.json(null);
  t.subtasks = db.prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index ASC, id ASC'
  ).all(t.id);
  res.json(t);
});


router.post('/', (req, res) => {
  const errors = validateTask(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const {
    title, description = '', deadline = null, type = 'regular',
    priority = 0, category_id = null,
    smart_specific = '', smart_measurable = '', smart_achievable = '',
    smart_relevant = '', smart_timebound = ''
  } = req.body;

  
  const next = db.prepare(
    'SELECT COALESCE(MAX(order_index), 0) + 1 AS n FROM tasks WHERE user_id = ?'
  ).get(req.session.userId).n;

  const info = db.prepare(`
    INSERT INTO tasks
    (user_id, category_id, title, description, deadline, type, priority, order_index,
     smart_specific, smart_measurable, smart_achievable, smart_relevant, smart_timebound)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    req.session.userId,
    category_id ? parseInt(category_id, 10) : null,
    sanitiseText(title),
    sanitiseText(description),
    deadline || null,
    type,
    parseInt(priority, 10) || 0,
    next,
    sanitiseText(smart_specific),
    sanitiseText(smart_measurable),
    sanitiseText(smart_achievable),
    sanitiseText(smart_relevant),
    sanitiseText(smart_timebound),
  );

  logActivity({ userId: req.session.userId, action: 'task_create', targetType: 'task', targetId: info.lastInsertRowid, ip: req.ip });
  res.json({ id: info.lastInsertRowid });
});


router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const owned = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, req.session.userId);
  if (!owned) return res.status(404).json({ error: 'Uzdevums nav atrasts' });

  const allowed = ['title','description','deadline','type','priority','category_id','status',
                   'smart_specific','smart_measurable','smart_achievable','smart_relevant','smart_timebound'];
  const updates = [];
  const values  = [];
  for (const k of allowed) {
    if (k in req.body) {
      let v = req.body[k];
      if (typeof v === 'string') v = sanitiseText(v);
      if (k === 'status' && !['pending','done'].includes(v)) continue;
      if (k === 'type'   && !['regular','smart'].includes(v)) continue;
      updates.push(`${k} = ?`); values.push(v);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nav datu atjaunināšanai' });

  updates.push("updated_at = datetime('now')");
  if (req.body.status === 'done') updates.push("completed_at = datetime('now')");
  if (req.body.status === 'pending') updates.push('completed_at = NULL');

  values.push(id, req.session.userId);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

  logActivity({ userId: req.session.userId, action: 'task_update', targetType: 'task', targetId: id, ip: req.ip });
  res.json({ ok: true });
});


router.put('/order/reorder', (req, res) => {
  const order = Array.isArray(req.body.order) ? req.body.order : [];
  const stmt  = db.prepare('UPDATE tasks SET order_index = ? WHERE id = ? AND user_id = ?');
  const tx    = db.transaction(() => {
    order.forEach((tid, idx) => stmt.run(idx + 1, parseInt(tid, 10), req.session.userId));
  });
  tx();
  res.json({ ok: true });
});


router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, req.session.userId);
  if (!info.changes) return res.status(404).json({ error: 'Uzdevums nav atrasts' });
  logActivity({ userId: req.session.userId, action: 'task_delete', targetType: 'task', targetId: id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
