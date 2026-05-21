const express = require('express');
const router  = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);


router.get('/', (req, res) => {
  const userId = req.session.userId;

  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='done'    THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN type='smart'     THEN 1 ELSE 0 END) AS smart,
      SUM(CASE WHEN type='regular'   THEN 1 ELSE 0 END) AS regular,
      SUM(CASE WHEN deadline IS NOT NULL AND deadline < datetime('now') AND status='pending' THEN 1 ELSE 0 END) AS overdue
    FROM tasks WHERE user_id = ?
  `).get(userId);


  const byCategory = db.prepare(`
    SELECT COALESCE(c.name, 'Bez kategorijas') AS category,
           COALESCE(c.color, '#888888')        AS color,
           COUNT(t.id)                         AS total,
           SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) AS done
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?
    GROUP BY c.id
    ORDER BY total DESC
  `).all(userId);


  const last7 = db.prepare(`
    SELECT date(completed_at) AS day, COUNT(*) AS count
    FROM tasks
    WHERE user_id = ? AND completed_at IS NOT NULL
      AND completed_at >= datetime('now', '-7 days')
    GROUP BY day
    ORDER BY day ASC
  `).all(userId);


  const subtaskProgress = db.prepare(`
    SELECT COUNT(s.id) AS total, SUM(CASE WHEN s.completed=1 THEN 1 ELSE 0 END) AS done
    FROM subtasks s JOIN tasks t ON t.id = s.task_id
    WHERE t.user_id = ?
  `).get(userId);

  const completionRate = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  res.json({ totals, byCategory, last7, subtaskProgress, completionRate });
});

module.exports = router;
