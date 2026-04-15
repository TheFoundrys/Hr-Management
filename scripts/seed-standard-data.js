const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
});

const departments = [
  'School of Computer Science',
  'Department of Mathematics',
  'School of Business',
  'Administration & Registry',
  'Maintenance & Support',
  'Security & Facilities'
];

const designations = [
  'Professor',
  'Assistant Professor',
  'Lecturer',
  'Office Registrar',
  'IT Support Technician',
  'Security Officer',
  'Maintenance Staff',
  'Accountant'
];

const leaveTypes = [
  { name: 'Casual Leave', code: 'CL', days: 12 },
  { name: 'Sick Leave', code: 'SL', days: 10 },
  { name: 'Earned Leave', code: 'EL', days: 30 },
  { name: 'Maternity Leave', code: 'ML', days: 180 },
  { name: 'Study Leave', code: 'STL', days: 730 }
];

async function seed() {
  console.log('🌱 Seeding Standard HR Data...');
  try {
    // 1. Seed Departments
    for (const name of departments) {
      await pool.query(
        'INSERT INTO departments (name, tenant_id) VALUES ($1, $2) ON CONFLICT (tenant_id, name) DO NOTHING',
        [name, '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972']
      );
    }
    console.log('✅ Departments seeded');

    // 2. Seed Designations
    for (const name of designations) {
      await pool.query(
        'INSERT INTO designations (name, tenant_id) VALUES ($1, $2) ON CONFLICT (tenant_id, name) DO NOTHING',
        [name, '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972']
      );
    }
    console.log('✅ Designations seeded');

    // 3. Seed Leave Types
    for (const lt of leaveTypes) {
      await pool.query(
        'INSERT INTO leave_types (name, code, max_per_year, is_paid, requires_approval, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [lt.name, lt.code, lt.days, true, true, '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972']
      );
    }
    console.log('✅ Leave Types seeded');

    console.log('✨ Data seeding complete!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
