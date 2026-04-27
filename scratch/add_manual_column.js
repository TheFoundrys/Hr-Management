const { Client } = require('pg');
require('dotenv').config();

async function alterTable() {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE payslip_records 
      ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;
    `);
    console.log('Column is_manual added successfully.');
  } catch (e) {
    console.error('Failed to alter table:', e);
  } finally {
    await client.end();
  }
}

alterTable();
