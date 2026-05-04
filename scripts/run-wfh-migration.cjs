/**
 * Applies migrations/add_wfh_requests.sql using POSTGRES_* from .env
 * Usage: node scripts/run-wfh-migration.cjs
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const sqlPath = path.join(__dirname, '..', 'migrations', 'add_wfh_requests.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DATABASE || 'hr_management_system',
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log('Applied migrations/add_wfh_requests.sql successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
