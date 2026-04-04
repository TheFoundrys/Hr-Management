const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'hr_management_system',
});

const departments = [
  'School of Computer Science',
  'Department of Mathematics',
  'Faculty of Physics',
  'School of Business & Economics',
  'Department of Humanities',
  'School of Engineering',
  'Faculty of Law',
  'Administration & Registry'
];

async function seed() {
  console.log('🌱 Seeding predefined departments...');
  try {
    for (const name of departments) {
      await pool.query(
        'INSERT INTO departments (name, tenant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [name, 'default']
      );
      console.log(`✅ Added: ${name}`);
    }
    console.log('✨ Seeding complete!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
