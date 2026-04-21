const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('./database');

function seedDatabase() {
  initializeDatabase();

  // Insert Roles
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles (role_name, description) VALUES (?, ?)');
  insertRole.run('admin', 'System administrator with full access');
  insertRole.run('clinician', 'Healthcare professional with patient record access');
  insertRole.run('patient', 'Patient with access to own health records');

  // Insert Permissions
  const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (permission_name, description) VALUES (?, ?)');
  const perms = [
    ['manage_users', 'Create, update, delete users'],
    ['view_audit_logs', 'Access system audit logs'],
    ['view_all_records', 'View all patient records'],
    ['system_dashboard', 'Access system statistics dashboard'],
    ['view_patient_records', 'View patient medical records'],
    ['create_medical_record', 'Create new medical records'],
    ['update_medical_record', 'Update existing medical records'],
    ['manage_appointments', 'Create and manage appointments'],
    ['view_own_records', 'View own health records'],
    ['view_own_appointments', 'View own appointments'],
    ['view_own_profile', 'View own patient profile'],
  ];
  perms.forEach(([name, desc]) => insertPerm.run(name, desc));

  // Map role IDs
  const adminRole = db.prepare('SELECT id FROM roles WHERE role_name = ?').get('admin');
  const clinicianRole = db.prepare('SELECT id FROM roles WHERE role_name = ?').get('clinician');
  const patientRole = db.prepare('SELECT id FROM roles WHERE role_name = ?').get('patient');

  // Map permission IDs
  const getPermId = (name) => db.prepare('SELECT id FROM permissions WHERE permission_name = ?').get(name).id;

  // Role-Permission assignments
  const insertRP = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');

  // Admin gets all
  perms.forEach(([name]) => insertRP.run(adminRole.id, getPermId(name)));

  // Clinician permissions
  ['view_patient_records', 'create_medical_record', 'update_medical_record', 'manage_appointments', 'view_own_profile'].forEach(p =>
    insertRP.run(clinicianRole.id, getPermId(p))
  );

  // Patient permissions
  ['view_own_records', 'view_own_appointments', 'view_own_profile'].forEach(p =>
    insertRP.run(patientRole.id, getPermId(p))
  );

  // Insert Users
  const hash = bcrypt.hashSync('Password123!', 10);
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)');

  // Admin
  insertUser.run('System Administrator', 'admin@ehrsystem.com', hash, adminRole.id);

  // Clinicians
  insertUser.run('Dr. Amina Okafor', 'amina.okafor@ehrsystem.com', hash, clinicianRole.id);
  insertUser.run('Dr. James Adeyemi', 'james.adeyemi@ehrsystem.com', hash, clinicianRole.id);
  insertUser.run('Nurse Fatima Bello', 'fatima.bello@ehrsystem.com', hash, clinicianRole.id);

  // Patients
  const patientData = [
    ['Emeka Chukwu', 'emeka.chukwu@gmail.com', '1985-03-14', 'Male', 'O+', '+234-802-111-0001'],
    ['Ngozi Obi', 'ngozi.obi@gmail.com', '1990-07-22', 'Female', 'A+', '+234-803-222-0002'],
    ['Tunde Afolabi', 'tunde.afolabi@gmail.com', '1978-11-05', 'Male', 'B-', '+234-805-333-0003'],
    ['Chidinma Eze', 'chidinma.eze@gmail.com', '1995-01-30', 'Female', 'AB+', '+234-807-444-0004'],
    ['Biodun Adeleke', 'biodun.adeleke@gmail.com', '1982-09-18', 'Male', 'O-', '+234-809-555-0005'],
    ['Amara Nwosu', 'amara.nwosu@gmail.com', '1998-04-12', 'Female', 'A-', '+234-801-666-0006'],
    ['Yemi Sanni', 'yemi.sanni@gmail.com', '1975-12-28', 'Male', 'B+', '+234-806-777-0007'],
    ['Kemi Babatunde', 'kemi.babatunde@gmail.com', '2000-06-15', 'Female', 'O+', '+234-804-888-0008'],
  ];

  const insertPatientProfile = db.prepare(`
    INSERT OR IGNORE INTO patients (user_id, date_of_birth, gender, blood_group, phone, address, emergency_contact, emergency_phone, allergies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const addresses = [
    '12 Adeola Crescent, Lagos', '45 University Road, Ibadan', '8 Ring Road, Benin City',
    '23 Wuse Zone 4, Abuja', '67 Agodi GRA, Ibadan', '11 Trans Amadi, Port Harcourt',
    '3 Old Aba Road, Umuahia', '88 Gombe Road, Kaduna'
  ];

  const allergies = ['Penicillin', 'None', 'Sulfa drugs', 'Aspirin', 'None', 'Latex', 'None', 'Codeine'];

  patientData.forEach(([name, email, dob, gender, blood, phone], i) => {
    insertUser.run(name, email, hash, patientRole.id);
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (user) {
      insertPatientProfile.run(user.id, dob, gender, blood, phone, addresses[i], 'Next of Kin', '+234-800-000-000' + i, allergies[i]);
    }
  });

  // Fetch clinician and patient IDs
  const clinician1 = db.prepare("SELECT id FROM users WHERE email='amina.okafor@ehrsystem.com'").get();
  const clinician2 = db.prepare("SELECT id FROM users WHERE email='james.adeyemi@ehrsystem.com'").get();
  const patient1 = db.prepare("SELECT id FROM users WHERE email='emeka.chukwu@gmail.com'").get();
  const patient2 = db.prepare("SELECT id FROM users WHERE email='ngozi.obi@gmail.com'").get();
  const patient3 = db.prepare("SELECT id FROM users WHERE email='tunde.afolabi@gmail.com'").get();
  const patient4 = db.prepare("SELECT id FROM users WHERE email='chidinma.eze@gmail.com'").get();
  const patient5 = db.prepare("SELECT id FROM users WHERE email='biodun.adeleke@gmail.com'").get();

  // Medical Records
  const insertRecord = db.prepare(`
    INSERT OR IGNORE INTO medical_records
    (patient_id, clinician_id, visit_date, chief_complaint, diagnosis, medications, treatment_plan, notes, vital_signs, lab_results)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const records = [
    [patient1.id, clinician1.id, '2026-01-10', 'Persistent cough and fever', 'Acute Bronchitis',
     'Amoxicillin 500mg TDS x 7 days, Paracetamol 1g PRN', 'Rest, increased fluid intake, follow-up in 1 week',
     'Patient appears moderately unwell. Chest clear on auscultation. No signs of pneumonia.',
     'BP: 122/78, Temp: 38.2°C, HR: 88bpm, SpO2: 97%', 'CXR: No consolidation. FBC: WBC 11.2'],

    [patient1.id, clinician2.id, '2026-02-15', 'Routine check-up', 'Hypertension Stage 1',
     'Amlodipine 5mg OD', 'Low-sodium diet, exercise 30min daily, blood pressure monitoring',
     'BP elevated on three readings. Started antihypertensive therapy.',
     'BP: 148/94, Temp: 36.8°C, HR: 76bpm, SpO2: 99%', 'Fasting glucose: 5.2 mmol/L, Cholesterol: 5.8 mmol/L'],

    [patient2.id, clinician1.id, '2026-01-22', 'Abdominal pain and nausea', 'Gastritis',
     'Omeprazole 20mg OD, Metoclopramide 10mg TDS', 'Bland diet, avoid NSAIDs, alcohol and spicy food',
     'H. pylori rapid test negative. Symptoms improving on PPIs.',
     'BP: 110/70, Temp: 36.9°C, HR: 72bpm, SpO2: 99%', 'H. pylori antigen: Negative, LFTs: Normal'],

    [patient3.id, clinician2.id, '2026-02-08', 'Joint pain and swelling', 'Rheumatoid Arthritis',
     'Methotrexate 10mg weekly, Folic acid 5mg weekly, Ibuprofen 400mg TDS PRN',
     'Physiotherapy referral, reduce physical strain, steroid injection if no improvement',
     'Symmetrical joint involvement of wrists and MCPs. RF positive.',
     'BP: 130/82, Temp: 36.7°C, HR: 80bpm, SpO2: 98%', 'RF: 64 IU/mL, ESR: 48mm/hr, Anti-CCP: Positive'],

    [patient4.id, clinician1.id, '2026-03-01', 'Fatigue and weight loss', 'Type 2 Diabetes Mellitus',
     'Metformin 500mg BD, Lifestyle modifications', 'Diabetic diet, monitor blood glucose daily, HbA1c every 3 months',
     'Patient newly diagnosed. BMI 28.4. No diabetic complications detected yet.',
     'BP: 118/76, Temp: 36.5°C, HR: 78bpm, SpO2: 98%', 'HbA1c: 8.2%, Fasting glucose: 11.4 mmol/L, Urine dipstick: Glucose +'],

    [patient5.id, clinician2.id, '2026-03-12', 'Chest pain on exertion', 'Stable Angina',
     'Aspirin 75mg OD, Atorvastatin 40mg nocte, GTN spray PRN', 'Cardiac rehabilitation, stress reduction, follow-up ETT',
     'ECG: Normal sinus rhythm. No ST changes at rest. Troponin negative.',
     'BP: 138/88, Temp: 36.8°C, HR: 82bpm, SpO2: 97%', 'ECG: NSR, Troponin I: <0.01 ng/mL, Cholesterol: 6.2 mmol/L'],
  ];
  records.forEach(r => insertRecord.run(...r));

  // Appointments
  const insertAppt = db.prepare(`
    INSERT OR IGNORE INTO appointments
    (patient_id, clinician_id, appointment_date, appointment_time, reason, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const appointments = [
    [patient1.id, clinician1.id, '2026-04-15', '09:00', 'Follow-up for bronchitis', 'scheduled', 'Check resolution of symptoms'],
    [patient1.id, clinician2.id, '2026-04-20', '11:00', 'BP monitoring follow-up', 'scheduled', 'Evaluate antihypertensive response'],
    [patient2.id, clinician1.id, '2026-04-12', '10:30', 'Gastroscopy review', 'completed', 'Review gastroscopy results'],
    [patient3.id, clinician2.id, '2026-04-18', '14:00', 'Rheumatology review', 'scheduled', 'Assess response to methotrexate'],
    [patient4.id, clinician1.id, '2026-04-22', '09:30', 'Diabetes 3-month review', 'scheduled', 'HbA1c and glucose monitoring'],
    [patient5.id, clinician2.id, '2026-04-25', '16:00', 'Cardiology follow-up', 'scheduled', 'Post-ETT results review'],
    [patient1.id, clinician1.id, '2026-03-10', '08:00', 'Initial consultation', 'completed', 'First visit'],
    [patient2.id, clinician1.id, '2026-04-28', '13:00', 'Routine check-up', 'scheduled', ''],
  ];
  appointments.forEach(a => insertAppt.run(...a));

  // Seed some audit logs
  const insertLog = db.prepare(`
    INSERT INTO audit_logs (user_email, user_role, action, resource, method, status, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertLog.run('admin@ehrsystem.com', 'admin', 'LOGIN', '/api/auth/login', 'POST', 'GRANTED', '192.168.1.1');
  insertLog.run('amina.okafor@ehrsystem.com', 'clinician', 'LOGIN', '/api/auth/login', 'POST', 'GRANTED', '192.168.1.5');
  insertLog.run('emeka.chukwu@gmail.com', 'patient', 'VIEW_RECORDS', '/api/patient/records', 'GET', 'GRANTED', '192.168.1.10');
  insertLog.run('unknown@hacker.com', null, 'UNAUTHORIZED_ACCESS', '/api/admin/users', 'GET', 'DENIED', '10.0.0.1');
  insertLog.run('james.adeyemi@ehrsystem.com', 'clinician', 'CREATE_RECORD', '/api/clinician/records', 'POST', 'GRANTED', '192.168.1.6');
  insertLog.run('amina.okafor@ehrsystem.com', 'clinician', 'VIEW_PATIENT', '/api/clinician/patients/1', 'GET', 'GRANTED', '192.168.1.5');
  insertLog.run('ngozi.obi@gmail.com', 'patient', 'VIEW_APPOINTMENTS', '/api/patient/appointments', 'GET', 'GRANTED', '192.168.1.11');
  insertLog.run('emeka.chukwu@gmail.com', 'patient', 'ACCESS_DENIED', '/api/admin/users', 'GET', 'DENIED', '192.168.1.10');

  console.log('[SEED] Database seeded successfully!');
  console.log('\nDefault login credentials (all passwords: Password123!):');
  console.log('  Admin:     admin@ehrsystem.com');
  console.log('  Clinician: amina.okafor@ehrsystem.com');
  console.log('  Clinician: james.adeyemi@ehrsystem.com');
  console.log('  Patient:   emeka.chukwu@gmail.com');
  console.log('  Patient:   ngozi.obi@gmail.com');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
