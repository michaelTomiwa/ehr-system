require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { db, initializeDatabase } = require('./config/database');

// Initialize DB
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/clinician', require('./routes/clinician'));
app.use('/api/patient', require('./routes/patient'));

// Health check
app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1 as ok').get();
    res.json({
      status: 'ok',
      database: 'ok',
      system: 'EHR RBAC System',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'unavailable',
      message: 'Database health check failed.',
      timestamp: new Date().toISOString()
    });
  }
});

// Access control test - attempt to access admin resource as other roles (demo)
app.get('/api/test/access-denied', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Access denied. This resource requires admin role.',
    status: 'DENIED'
  });
});

// Serve frontend for all non-API routes (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Secure EHR System with RBAC - Running   ║
║   Port: ${PORT}                               ║
║   URL:  http://localhost:${PORT}              ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
