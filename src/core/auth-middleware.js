const jwt = require('jsonwebtoken');
const { loadEnv } = require('./env');

function getTokenFromHeader(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { JWT_SECRET } = loadEnv();
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = { userId: String(payload.userId), role: String(payload.role) };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}


function requireRole(role) {
  return (req, res, next) => {
    const current = req.auth?.role;
    if (!current) return res.status(401).json({ error: 'Unauthorized' });
    if (current !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { requireAuth, requireRole };
