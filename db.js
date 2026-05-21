const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'app.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');


db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  description   TEXT    DEFAULT '',
  role          TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  color      TEXT    DEFAULT '#888888',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  category_id     INTEGER,
  title           TEXT    NOT NULL,
  description     TEXT    DEFAULT '',
  deadline        TEXT,
  type            TEXT    NOT NULL DEFAULT 'regular' CHECK(type IN ('regular','smart')),
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done')),
  priority        INTEGER NOT NULL DEFAULT 0,
  order_index     INTEGER NOT NULL DEFAULT 0,
  smart_specific    TEXT DEFAULT '',
  smart_measurable  TEXT DEFAULT '',
  smart_achievable  TEXT DEFAULT '',
  smart_relevant    TEXT DEFAULT '',
  smart_timebound   TEXT DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT,
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subtasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER NOT NULL,
  title       TEXT    NOT NULL,
  completed   INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,
  action      TEXT    NOT NULL,
  target_type TEXT,
  target_id   INTEGER,
  details     TEXT,
  ip_address  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_user      ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_task   ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_log_user        ON activity_log(user_id);
`);


function seedAdmin() {
  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin'").get().c;
  if (adminCount === 0) {
    const hash = bcrypt.hashSync('Admin123!', 12);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, description, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).run('admin', 'admin@example.com', hash, 'Default administrator account');
    console.log('[db] Seeded default admin: admin@example.com / Admin123!  — CHANGE THIS PASSWORD.');
  }
}
seedAdmin();

function logActivity({ userId, action, targetType, targetId, details, ip }) {
  try {
    db.prepare(`
      INSERT INTO activity_log (user_id, action, target_type, target_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId ?? null, action, targetType ?? null, targetId ?? null, details ?? null, ip ?? null);
  } catch (e) {
    console.error('[db] logActivity failed:', e.message);
  }
}

module.exports = { db, logActivity };

if (require.main === module) {
  console.log('[db] Database initialised at', DB_PATH);
}
