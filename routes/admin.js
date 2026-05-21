const express = require('express');
const router  = express.Router();
const { db, logActivity } = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);


router.get('/users', (req, res) => {
  const { search, role } = req.query;
  const where = ['1=1'];
  const params = [];
  if (search) {
    where.push('(username LIKE ? OR email LIKE ?)');
    const q = `%${search}%`; params.push(q, q);
  }
  if (role && ['user', 'admin'].includes(role)) {
    where.push('role = ?'); params.push(role);
  }
  const rows = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at,
           (SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id) AS task_count,
           (SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id AND t.status='done') AS done_count
    FROM users u
    WHERE ${where.join(' AND ')}
    ORDER BY u.created_at DESC
  `).all(...params);
  res.json(rows);
});


router.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.session.userId)
    return res.status(400).json({ error: 'Nevar mainīt savu kontu admin panelī' });

  const fields = [], values = [];
  if (req.body.role && ['user', 'admin'].includes(req.body.role)) {
    fields.push('role = ?'); values.push(req.body.role);
  }
  if ('is_active' in req.body) {
    fields.push('is_active = ?'); values.push(req.body.is_active ? 1 : 0);
  }
  if (!fields.length) return res.status(400).json({ error: 'Nav datu' });
  values.push(id);
  const info = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  if (!info.changes) return res.status(404).json({ error: 'Lietotājs nav atrasts' });
  logActivity({ userId: req.session.userId, action: 'admin_user_update', targetType: 'user', targetId: id, ip: req.ip });
  res.json({ ok: true });
});


router.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.session.userId)
    return res.status(400).json({ error: 'Nevar dzēst savu kontu' });
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'Nav atrasts' });
  logActivity({ userId: req.session.userId, action: 'admin_user_delete', targetType: 'user', targetId: id, ip: req.ip });
  res.json({ ok: true });
});


router.get('/stats', (req, res) => {
  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE role='admin') AS admin_count,
      (SELECT COUNT(*) FROM tasks) AS total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE status='done') AS done_tasks,
      (SELECT COUNT(*) FROM subtasks) AS total_subtasks,
      (SELECT COUNT(*) FROM categories) AS total_categories
  `).get();


  const topUsers = db.prepare(`
    SELECT u.id, u.username,
           COUNT(t.id) AS total_tasks,
           SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) AS done_tasks,
           CASE WHEN COUNT(t.id) > 0
                THEN ROUND(100.0 * SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) / COUNT(t.id), 1)
                ELSE 0 END AS completion_pct
    FROM users u
    LEFT JOIN tasks t ON t.user_id = u.id
    GROUP BY u.id
    ORDER BY total_tasks DESC
    LIMIT 5
  `).all();


  const byType = db.prepare(`
    SELECT type, COUNT(*) AS count FROM tasks GROUP BY type
  `).all();


  const recentActivity = db.prepare(`
    SELECT a.id, a.action, a.target_type, a.target_id, a.created_at, a.ip_address,
           u.username
    FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.id DESC LIMIT 30
  `).all();

  res.json({ totals, topUsers, byType, recentActivity });
});

module.exports = router;
