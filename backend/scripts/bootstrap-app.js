const { db, initializeDatabase } = require('../config/database');
const { seedDatabase } = require('../config/seed');

function hasSeedData() {
  const rolesCount = db.prepare('SELECT COUNT(*) as count FROM roles').get().count;
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  return rolesCount > 0 && usersCount > 0;
}

function bootstrap() {
  initializeDatabase();

  if (!hasSeedData()) {
    console.log('[BOOTSTRAP] No seed data found. Seeding database for first run...');
    seedDatabase();
  } else {
    console.log('[BOOTSTRAP] Existing database detected. Skipping seed step.');
  }

  require('../server');
}

bootstrap();
