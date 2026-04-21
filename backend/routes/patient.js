const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, requireRole, logAudit } = require('../middleware/auth');

router.use(authenticateToken, requireRole('patient'));

// GET /api/patient/profile - View own profile
router.get('/profile', (req, res) => {
  logAudit(req, req.user, 'VIEW_OWN_PROFILE', 'GRANTED');
  const profile = db.prepare(`
    SELECT u.id, u.name, u.email, u.created_at, u.last_login,
      pt.date_of_birth, pt.gender, pt.blood_group, pt.phone, pt.address,
      pt.emergency_contact, pt.emergency_phone, pt.insurance_number, pt.allergies
    FROM users u
    LEFT JOIN patients pt ON pt.user_id = u.id
    WHERE u.id = ?
  `).get(req.user.id);

  res.json({ success: true, data: profile });
});

// GET /api/patient/records - View own medical records
router.get('/records', (req, res) => {
  logAudit(req, req.user, 'VIEW_OWN_RECORDS', 'GRANTED');
  const records = db.prepare(`
    SELECT mr.id, mr.visit_date, mr.chief_complaint, mr.diagnosis,
      mr.medications, mr.treatment_plan, mr.notes, mr.vital_signs, mr.lab_results,
      mr.created_at, mr.updated_at,
      c.name as clinician_name
    FROM medical_records mr
    JOIN users c ON mr.clinician_id = c.id
    WHERE mr.patient_id = ?
    ORDER BY mr.visit_date DESC
  `).all(req.user.id);
  res.json({ success: true, data: records });
});

// GET /api/patient/appointments - View own appointments
router.get('/appointments', (req, res) => {
  logAudit(req, req.user, 'VIEW_OWN_APPOINTMENTS', 'GRANTED');
  const appointments = db.prepare(`
    SELECT a.id, a.appointment_date, a.appointment_time, a.reason, a.status, a.notes, a.created_at,
      c.name as clinician_name, c.email as clinician_email
    FROM appointments a
    JOIN users c ON a.clinician_id = c.id
    WHERE a.patient_id = ?
    ORDER BY a.appointment_date DESC
  `).all(req.user.id);
  res.json({ success: true, data: appointments });
});

// GET /api/patient/summary - Quick health summary
router.get('/summary', (req, res) => {
  logAudit(req, req.user, 'VIEW_HEALTH_SUMMARY', 'GRANTED');
  const summary = {
    total_visits: db.prepare('SELECT COUNT(*) as c FROM medical_records WHERE patient_id = ?').get(req.user.id).c,
    upcoming_appointments: db.prepare("SELECT COUNT(*) as c FROM appointments WHERE patient_id = ? AND status = 'scheduled'").get(req.user.id).c,
    last_visit: db.prepare("SELECT visit_date, diagnosis FROM medical_records WHERE patient_id = ? ORDER BY visit_date DESC LIMIT 1").get(req.user.id),
    next_appointment: db.prepare(`
      SELECT a.appointment_date, a.appointment_time, a.reason, u.name as clinician_name
      FROM appointments a JOIN users u ON a.clinician_id = u.id
      WHERE a.patient_id = ? AND a.status = 'scheduled' ORDER BY a.appointment_date, a.appointment_time LIMIT 1
    `).get(req.user.id),
    active_medications: db.prepare(`
      SELECT medications FROM medical_records WHERE patient_id = ? AND medications IS NOT NULL ORDER BY visit_date DESC LIMIT 1
    `).get(req.user.id),
  };
  res.json({ success: true, data: summary });
});

module.exports = router;
