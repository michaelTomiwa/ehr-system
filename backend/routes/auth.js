const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { db } = require('../config/database');
const { generateToken, logAudit, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = db.prepare(`
    SELECT u.*, r.role_name FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.email = ? AND u.is_active = 1
  `).get(email.toLowerCase().trim());

  if (!user) {
    logAudit(req, null, 'LOGIN_FAILED', 'DENIED', `Email not found: ${email}`);
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    logAudit(req, { email: user.email, role: user.role_name }, 'LOGIN_FAILED', 'DENIED', 'Invalid password');
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  // Update last login
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const token = generateToken(user.id, user.role_name);
  logAudit(req, { id: user.id, email: user.email, role: user.role_name }, 'LOGIN', 'GRANTED', 'Successful login');

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name
    }
  });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  logAudit(req, req.user, 'LOGOUT', 'GRANTED', 'User logged out');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.created_at, u.last_login, r.role_name
    FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?
  `).get(req.user.id);

  const permissions = db.prepare(`
    SELECT p.permission_name FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    WHERE r.role_name = ?
  `).all(req.user.role).map(p => p.permission_name);

  res.json({ success: true, user: { ...user, permissions } });
});

module.exports = router;
