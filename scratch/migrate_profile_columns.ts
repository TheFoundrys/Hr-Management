import { query } from '../src/lib/db/postgres';

async function addProfileColumns() {
  const columns = [
    ['middle_name', 'VARCHAR(255)'],
    ['display_name', 'VARCHAR(255)'],
    ['gender', 'VARCHAR(50)'],
    ['marital_status', 'VARCHAR(50)'],
    ['blood_group', 'VARCHAR(20)'],
    ['physically_handicapped', 'BOOLEAN DEFAULT FALSE'],
    ['nationality', 'VARCHAR(100)'],
    ['personal_email', 'VARCHAR(255)'],
    ['work_phone', 'VARCHAR(50)'],
    ['residence_phone', 'VARCHAR(50)'],
    ['permanent_address', 'TEXT'],
    ['professional_summary', 'TEXT'],
    ['aadhaar_number', 'VARCHAR(50)'],
    ['pan_number', 'VARCHAR(50)'],
    ['edu_degree', 'VARCHAR(255)'],
    ['edu_uni', 'VARCHAR(255)'],
    ['edu_branch', 'VARCHAR(255)'],
    ['edu_cgpa', 'VARCHAR(50)'],
    ['edu_join', 'VARCHAR(50)'],
    ['edu_end', 'VARCHAR(50)'],
    ['education', 'JSONB'],
    ['experience', 'JSONB'],
    ['identity_info', 'JSONB']
  ];

  for (const [name, type] of columns) {
    try {
      await query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS ${name} ${type}`);
      console.log(`✅ Added column: ${name}`);
    } catch (err) {
      console.error(`❌ Error adding column ${name}:`, err);
    }
  }
}

addProfileColumns();
