const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'EHR_SECURE_JWT_SECRET_2026_RBAC';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logAudit(req, null, 'UNAUTHORIZED', 'DENIED', 'No token provided');
    return res.status(401).json({ success: false, message: 'Access denied. Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token. User not found.' });
    }
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role_name };
    next();
  } catch (err) {
    logAudit(req, null, 'INVALID_TOKEN', 'DENIED', err.message);
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      logAudit(req, req.user, 'ACCESS_DENIED', 'DENIED', `Role ${req.user.role} not in [${roles.join(',')}]`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const hasPermission = db.prepare(`
      SELECT rp.* FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE r.role_name = ? AND p.permission_name = ?
    `).get(req.user.role, permission);

    if (!hasPermission) {
      logAudit(req, req.user, 'PERMISSION_DENIED', 'DENIED', `Missing permission: ${permission}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. You do not have '${permission}' permission.`
      });
    }
    next();
  };
}

function logAudit(req, user, action, status, details = '') {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, user_email, user_role, action, resource, method, status, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user?.id || null,
      user?.email || req.headers['x-user-email'] || null,
      user?.role || null,
      action,
      req.originalUrl || req.url,
      req.method,
      status,
      details,
      req.ip || req.connection?.remoteAddress || 'unknown'
    );
  } catch (e) { /* silent fail for audit */ }
}

function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '8h' });
}

module.exports = { authenticateToken, requireRole, requirePermission, logAudit, generateToken };
