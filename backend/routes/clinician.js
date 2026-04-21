const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, requireRole, logAudit } = require('../middleware/auth');

router.use(authenticateToken, requireRole('clinician', 'admin'));

// GET /api/clinician/dashboard
router.get('/dashboard', (req, res) => {
  logAudit(req, req.user, 'VIEW_CLINICIAN_DASHBOARD', 'GRANTED');
  const stats = {
    my_patients: db.prepare(`
      SELECT COUNT(DISTINCT patient_id) as c FROM medical_records WHERE clinician_id = ?
    `).get(req.user.id).c,
    my_appointments: db.prepare(`
      SELECT COUNT(*) as c FROM appointments WHERE clinician_id = ? AND status = 'scheduled'
    `).get(req.user.id).c,
    records_created: db.prepare(`
      SELECT COUNT(*) as c FROM medical_records WHERE clinician_id = ?
    `).get(req.user.id).c,
    recent_patients: db.prepare(`
      SELECT DISTINCT u.id, u.name, u.email, mr.visit_date, mr.diagnosis
      FROM users u
      JOIN medical_records mr ON mr.patient_id = u.id
      WHERE mr.clinician_id = ?
      ORDER BY mr.created_at DESC LIMIT 5
    `).all(req.user.id),
    upcoming_appointments: db.prepare(`
      SELECT a.*, p.name as patient_name, p.email as patient_email
      FROM appointments a JOIN users p ON a.patient_id = p.id
      WHERE a.clinician_id = ? AND a.status = 'scheduled'
      ORDER BY a.appointment_date, a.appointment_time LIMIT 5
    `).all(req.user.id)
  };
  res.json({ success: true, data: stats });
});

// GET /api/clinician/patients - List all patients
router.get('/patients', (req, res) => {
  logAudit(req, req.user, 'VIEW_PATIENTS_LIST', 'GRANTED');
  const patients = db.prepare(`
    SELECT u.id, u.name, u.email, u.created_at,
      pt.date_of_birth, pt.gender, pt.blood_group, pt.phone, pt.allergies
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN patients pt ON pt.user_id = u.id
    WHERE r.role_name = 'patient' AND u.is_active = 1
    ORDER BY u.name
  `).all();
  res.json({ success: true, data: patients });
});

// GET /api/clinician/patients/:id - View patient detail
router.get('/patients/:id', (req, res) => {
  const patientId = req.params.id;
  logAudit(req, req.user, 'VIEW_PATIENT_DETAIL', 'GRANTED', `Patient ID: ${patientId}`);

  const patient = db.prepare(`
    SELECT u.id, u.name, u.email, u.created_at,
      pt.date_of_birth, pt.gender, pt.blood_group, pt.phone, pt.address,
      pt.emergency_contact, pt.emergency_phone, pt.insurance_number, pt.allergies
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN patients pt ON pt.user_id = u.id
    WHERE u.id = ? AND r.role_name = 'patient'
  `).get(patientId);

  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

  const records = db.prepare(`
    SELECT mr.*, c.name as clinician_name
    FROM medical_records mr
    JOIN users c ON mr.clinician_id = c.id
    WHERE mr.patient_id = ?
    ORDER BY mr.visit_date DESC
  `).all(patientId);

  const appointments = db.prepare(`
    SELECT a.*, c.name as clinician_name
    FROM appointments a
    JOIN users c ON a.clinician_id = c.id
    WHERE a.patient_id = ?
    ORDER BY a.appointment_date DESC
  `).all(patientId);

  res.json({ success: true, data: { patient, records, appointments } });
});

// GET /api/clinician/records - Get all records created by this clinician
router.get('/records', (req, res) => {
  logAudit(req, req.user, 'VIEW_OWN_RECORDS_LIST', 'GRANTED');
  const records = db.prepare(`
    SELECT mr.*, p.name as patient_name, p.email as patient_email
    FROM medical_records mr
    JOIN users p ON mr.patient_id = p.id
    WHERE mr.clinician_id = ?
    ORDER BY mr.created_at DESC
  `).all(req.user.id);
  res.json({ success: true, data: records });
});

// POST /api/clinician/records - Create medical record
router.post('/records', (req, res) => {
  const { patient_id, visit_date, chief_complaint, diagnosis, medications, treatment_plan, notes, vital_signs, lab_results } = req.body;

  if (!patient_id || !visit_date || !diagnosis) {
    return res.status(400).json({ success: false, message: 'patient_id, visit_date and diagnosis are required.' });
  }

  // Verify patient exists
  const patient = db.prepare("SELECT u.id FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=? AND r.role_name='patient'").get(patient_id);
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

  const result = db.prepare(`
    INSERT INTO medical_records (patient_id, clinician_id, visit_date, chief_complaint, diagnosis, medications, treatment_plan, notes, vital_signs, lab_results)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(patient_id, req.user.id, visit_date, chief_complaint, diagnosis, medications, treatment_plan, notes, vital_signs, lab_results);

  logAudit(req, req.user, 'CREATE_MEDICAL_RECORD', 'GRANTED', `Record ID: ${result.lastInsertRowid} for Patient: ${patient_id}`);
  res.status(201).json({ success: true, message: 'Medical record created.', recordId: result.lastInsertRowid });
});

// PUT /api/clinician/records/:id - Update medical record
router.put('/records/:id', (req, res) => {
  const recordId = req.params.id;
  const record = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(recordId);
  if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
  if (record.clinician_id !== req.user.id && req.user.role !== 'admin') {
    logAudit(req, req.user, 'UPDATE_RECORD_DENIED', 'DENIED', `Record ${recordId} belongs to another clinician`);
    return res.status(403).json({ success: false, message: 'You can only update your own records.' });
  }

  const { chief_complaint, diagnosis, medications, treatment_plan, notes, vital_signs, lab_results } = req.body;
  db.prepare(`
    UPDATE medical_records SET chief_complaint=?, diagnosis=?, medications=?, treatment_plan=?, notes=?, vital_signs=?, lab_results=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(chief_complaint || record.chief_complaint, diagnosis || record.diagnosis, medications || record.medications,
     treatment_plan || record.treatment_plan, notes || record.notes, vital_signs || record.vital_signs, lab_results || record.lab_results, recordId);

  logAudit(req, req.user, 'UPDATE_MEDICAL_RECORD', 'GRANTED', `Record ID: ${recordId}`);
  res.json({ success: true, message: 'Record updated successfully.' });
});

// GET /api/clinician/appointments
router.get('/appointments', (req, res) => {
  logAudit(req, req.user, 'VIEW_APPOINTMENTS', 'GRANTED');
  const appointments = db.prepare(`
    SELECT a.*, p.name as patient_name, p.email as patient_email
    FROM appointments a
    JOIN users p ON a.patient_id = p.id
    WHERE a.clinician_id = ?
    ORDER BY a.appointment_date DESC
  `).all(req.user.id);
  res.json({ success: true, data: appointments });
});

// POST /api/clinician/appointments - Create appointment
router.post('/appointments', (req, res) => {
  const { patient_id, appointment_date, appointment_time, reason, notes } = req.body;
  if (!patient_id || !appointment_date || !appointment_time) {
    return res.status(400).json({ success: false, message: 'patient_id, date and time required.' });
  }

  const result = db.prepare(`
    INSERT INTO appointments (patient_id, clinician_id, appointment_date, appointment_time, reason, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(patient_id, req.user.id, appointment_date, appointment_time, reason, notes);

  logAudit(req, req.user, 'CREATE_APPOINTMENT', 'GRANTED', `Appointment for Patient: ${patient_id} on ${appointment_date}`);
  res.status(201).json({ success: true, message: 'Appointment scheduled.', appointmentId: result.lastInsertRowid });
});

// PUT /api/clinician/appointments/:id/status
router.put('/appointments/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  db.prepare('UPDATE appointments SET status = ? WHERE id = ? AND clinician_id = ?').run(status, req.params.id, req.user.id);
  logAudit(req, req.user, 'UPDATE_APPOINTMENT_STATUS', 'GRANTED', `Appointment ${req.params.id} -> ${status}`);
  res.json({ success: true, message: 'Appointment status updated.' });
});

module.exports = router;
