const { Client } = require('pg');
require('dotenv').config();

async function checkLeaveApprovalsSchema() {
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
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) 
      FROM pg_constraint c 
      JOIN pg_class t ON t.oid = c.conrelid 
      WHERE t.relname = 'leave_approvals'
    `);
    console.log('leave_approvals table constraints:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check schema:', e);
  } finally {
    await client.end();
  }
}

checkLeaveApprovalsSchema();
