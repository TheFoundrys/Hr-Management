const { Client } = require('pg');
require('dotenv').config();

async function checkPayslipsSchema() {
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
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payslip_records'
    `);
    console.log('payslip_records table columns:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check schema:', e);
  } finally {
    await client.end();
  }
}

checkPayslipsSchema();
