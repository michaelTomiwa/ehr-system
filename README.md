# Secure Cloud-Based EHR System with RBAC
## University of the West of Scotland — MSc Computer Science

### Project Title
Design and Implementation of a Secure Cloud-Based Electronic Health Record (EHR) System using Role-Based Access Control

---

## System Overview
A full-stack web application implementing Role-Based Access Control (RBAC) for secure Electronic Health Records management in a cloud-based environment.

---

## Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js v18+, Express.js |
| Database | SQLite (via better-sqlite3) |
| Authentication | JSON Web Tokens (JWT) + bcryptjs |
| Cloud Platform | Render (or any Node.js host / AWS) |

---

## User Roles & Permissions
| Permission | Admin | Clinician | Patient |
|------------|-------|-----------|---------|
| Manage Users | ✓ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ |
| View All Records | ✓ | ✗ | ✗ |
| System Dashboard | ✓ | ✗ | ✗ |
| View Patient Records | ✓ | ✓ | ✗ |
| Create Medical Record | ✓ | ✓ | ✗ |
| Update Medical Record | ✓ | ✓ | ✗ |
| Manage Appointments | ✓ | ✓ | ✗ |
| View Own Records | ✓ | ✗ | ✓ |
| View Own Appointments | ✓ | ✗ | ✓ |
| View Own Profile | ✓ | ✓ | ✓ |

---

## Installation & Running

### Prerequisites
- Node.js v18 or higher
- npm v9 or higher

### Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Seed the database (first time only)
node config/seed.js

# Start the server
node server.js
```

The server will start on **http://localhost:5000**

### Demo Accounts (Password: Password123!)
| Role | Email |
|------|-------|
| Admin | admin@ehrsystem.com |
| Clinician | amina.okafor@ehrsystem.com |
| Clinician | james.adeyemi@ehrsystem.com |
| Patient | emeka.chukwu@gmail.com |
| Patient | ngozi.obi@gmail.com |
| Patient | ngozi.obi@gmail.com |
| Patient | tunde.afolabi@gmail.com |

---

## Project Structure
```
ehr-system/
├── backend/
│   ├── config/
│   │   ├── database.js      # SQLite database setup & schema
│   │   └── seed.js          # Database seeding with synthetic data
│   ├── middleware/
│   │   └── auth.js          # JWT auth + RBAC middleware
│   ├── routes/
│   │   ├── auth.js          # Login, logout, token verification
│   │   ├── admin.js         # Admin-only routes
│   │   ├── clinician.js     # Clinician routes
│   │   └── patient.js       # Patient routes
│   ├── server.js            # Express server entry point
│   ├── package.json
│   └── ehr.db               # SQLite database (auto-generated)
└── frontend/
    ├── index.html           # Login page
    ├── access-denied.html   # 403 page
    ├── assets/
    │   ├── css/style.css    # Global stylesheet
    │   └── js/app.js        # Core JS utilities
    └── pages/
        ├── admin/dashboard.html      # Admin interface
        ├── clinician/dashboard.html  # Clinician interface
        └── patient/dashboard.html   # Patient portal
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Authenticate user |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/me | Get current user profile |

### Admin (Role: admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | System statistics |
| GET | /api/admin/users | List all users |
| POST | /api/admin/users | Create user |
| PUT | /api/admin/users/:id | Update user |
| DELETE | /api/admin/users/:id | Deactivate user |
| GET | /api/admin/audit-logs | View audit logs |
| GET | /api/admin/roles | View roles & permissions |
| GET | /api/admin/all-records | View all medical records |

### Clinician (Role: clinician)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/clinician/dashboard | Clinician stats |
| GET | /api/clinician/patients | List all patients |
| GET | /api/clinician/patients/:id | Patient detail |
| GET | /api/clinician/records | Own records |
| POST | /api/clinician/records | Create record |
| PUT | /api/clinician/records/:id | Update record |
| GET | /api/clinician/appointments | View appointments |
| POST | /api/clinician/appointments | Schedule appointment |
| PUT | /api/clinician/appointments/:id/status | Update status |

### Patient (Role: patient)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/patient/profile | Own profile |
| GET | /api/patient/records | Own medical records |
| GET | /api/patient/appointments | Own appointments |
| GET | /api/patient/summary | Health summary |

---

## Security Features
- JWT authentication with 8-hour token expiry
- bcrypt password hashing (salt factor 10)
- Middleware-based RBAC enforcement
- Comprehensive audit logging (all access decisions)
- HTTP 401 for unauthenticated requests
- HTTP 403 for insufficient permissions
- Role-specific frontend views

---

## Evaluation Results
- **Functional Tests:** 18/18 PASS (100%)
- **Security Tests:** 12/12 PASS (100%)
- **RBAC Enforcement Rate:** 100%
- **Overall:** 30/30 test cases passed

