function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Nepieciešama autentifikācija' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Nepieciešamas administrātora tiesības' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
