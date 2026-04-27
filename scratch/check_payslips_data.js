const { Client } = require('pg');
require('dotenv').config();

async function checkPayslipsData() {
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
      SELECT id, user_id, month, year, basic_salary, hra, allowances, deductions, net_salary, status, generated_at 
      FROM payslip_records 
      ORDER BY generated_at DESC 
      LIMIT 10
    `);
    console.log('Recent Payslip Records:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check payslips:', e);
  } finally {
    await client.end();
  }
}

checkPayslipsData();
