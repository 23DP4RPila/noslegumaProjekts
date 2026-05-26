// Main Express server — entry point
require('dotenv').config();

const express     = require('express');
const path        = require('path');
const helmet      = require('helmet');
const session     = require('express-session');
const cookieParser = require('cookie-parser');
const rateLimit   = require('express-rate-limit');

require('./db'); 

const authRoutes       = require('./routes/auth');
const tasksRoutes      = require('./routes/tasks');
const subtasksRoutes   = require('./routes/subtasks');
const categoriesRoutes = require('./routes/categories');
const statsRoutes      = require('./routes/stats');
const adminRoutes      = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;


app.set('trust proxy', 1);

// ------- OWASP security headers (helmet) -------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ------- Body parsing -------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());

// ------- Session (httpOnly cookies, sameSite=lax) -------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

// ------- Rate limiting (auth endpoints) -------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Pārāk daudz pieprasījumu. Mēģiniet vēlāk.' },
  standardHeaders: true,
  legacyHeaders: false,
});


// ------- API routes -------
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/tasks',      tasksRoutes);
app.use('/api/subtasks',   subtasksRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/stats',      statsRoutes);
app.use('/api/admin',      adminRoutes);

// ------- Static files (frontend) -------
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('service-worker.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// ------- Global error handler -------
app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: err.expose ? err.message : 'Servera kļūda',
  });
});

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  console.log(`[server] Default admin login: admin@example.com / Admin123!`);
});
