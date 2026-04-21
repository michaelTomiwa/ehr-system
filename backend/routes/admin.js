const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, requireRole, logAudit } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken, requireRole('admin'));

// GET /api/admin/dashboard - System statistics
router.get('/dashboard', (req, res) => {
  logAudit(req, req.user, 'VIEW_DASHBOARD', 'GRANTED');
  const stats = {
    total_users: db.prepare("SELECT COUNT(*) as c FROM users").get().c,
    total_patients: db.prepare("SELECT COUNT(*) as c FROM users u JOIN roles r ON u.role_id=r.id WHERE r.role_name='patient'").get().c,
    total_clinicians: db.prepare("SELECT COUNT(*) as c FROM users u JOIN roles r ON u.role_id=r.id WHERE r.role_name='clinician'").get().c,
    total_admins: db.prepare("SELECT COUNT(*) as c FROM users u JOIN roles r ON u.role_id=r.id WHERE r.role_name='admin'").get().c,
    total_records: db.prepare("SELECT COUNT(*) as c FROM medical_records").get().c,
    total_appointments: db.prepare("SELECT COUNT(*) as c FROM appointments").get().c,
    upcoming_appointments: db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status='scheduled'").get().c,
    total_denied_access: db.prepare("SELECT COUNT(*) as c FROM audit_logs WHERE status='DENIED'").get().c,
    recent_logins: db.prepare("SELECT user_email, user_role, timestamp FROM audit_logs WHERE action='LOGIN' ORDER BY timestamp DESC LIMIT 5").all(),
  };
  res.json({ success: true, data: stats });
});

// GET /api/admin/users - List all users
router.get('/users', (req, res) => {
  logAudit(req, req.user, 'VIEW_USERS', 'GRANTED');
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, r.role_name as role, u.is_active, u.created_at, u.last_login
    FROM users u JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ success: true, data: users });
});

// POST /api/admin/users - Create user
router.post('/users', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields required.' });
  }

  const roleRow = db.prepare('SELECT id FROM roles WHERE role_name = ?').get(role);
  if (!roleRow) return res.status(400).json({ success: false, message: 'Invalid role.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ success: false, message: 'Email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)').run(name, email.toLowerCase(), hash, roleRow.id);

  if (role === 'patient') {
    db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(result.lastInsertRowid);
  }

  logAudit(req, req.user, 'CREATE_USER', 'GRANTED', `Created user: ${email} (${role})`);
  res.status(201).json({ success: true, message: 'User created successfully.', userId: result.lastInsertRowid });
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', (req, res) => {
  const { name, email, role, is_active } = req.body;
  const userId = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  let roleId = user.role_id;
  if (role) {
    const roleRow = db.prepare('SELECT id FROM roles WHERE role_name = ?').get(role);
    if (!roleRow) return res.status(400).json({ success: false, message: 'Invalid role.' });
    roleId = roleRow.id;
  }

  db.prepare('UPDATE users SET name=?, email=?, role_id=?, is_active=? WHERE id=?').run(
    name || user.name,
    email || user.email,
    roleId,
    is_active !== undefined ? is_active : user.is_active,
    userId
  );

  logAudit(req, req.user, 'UPDATE_USER', 'GRANTED', `Updated user ID: ${userId}`);
  res.json({ success: true, message: 'User updated successfully.' });
});

// DELETE /api/admin/users/:id - Deactivate user
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
  }
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
  logAudit(req, req.user, 'DEACTIVATE_USER', 'GRANTED', `Deactivated user ID: ${userId}`);
  res.json({ success: true, message: 'User deactivated successfully.' });
});

// GET /api/admin/audit-logs - View audit logs
router.get('/audit-logs', (req, res) => {
  logAudit(req, req.user, 'VIEW_AUDIT_LOGS', 'GRANTED');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const filter = req.query.status || '';

  let query = 'SELECT * FROM audit_logs';
  let params = [];
  if (filter) { query += ' WHERE status = ?'; params.push(filter.toUpperCase()); }
  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logs = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM audit_logs' + (filter ? ' WHERE status=?' : '')).get(...(filter ? [filter.toUpperCase()] : [])).c;
  res.json({ success: true, data: logs, total, page, limit });
});

// GET /api/admin/roles - List roles and permissions
router.get('/roles', (req, res) => {
  const roles = db.prepare('SELECT * FROM roles').all();
  const result = roles.map(r => {
    const perms = db.prepare(`
      SELECT p.permission_name, p.description FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?
    `).all(r.id);
    return { ...r, permissions: perms };
  });
  res.json({ success: true, data: result });
});

// GET /api/admin/all-records - View all patient records
router.get('/all-records', (req, res) => {
  logAudit(req, req.user, 'VIEW_ALL_RECORDS', 'GRANTED');
  const records = db.prepare(`
    SELECT mr.*, 
      p.name as patient_name, p.email as patient_email,
      c.name as clinician_name
    FROM medical_records mr
    JOIN users p ON mr.patient_id = p.id
    JOIN users c ON mr.clinician_id = c.id
    ORDER BY mr.created_at DESC
  `).all();
  res.json({ success: true, data: records });
});

module.exports = router;
