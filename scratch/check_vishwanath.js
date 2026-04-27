const { Client } = require('pg');
require('dotenv').config();

async function checkEmployee() {
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
      SELECT id, first_name, last_name, university_id, salary_basic, salary_hra, salary_allowances, salary_deductions 
      FROM employees 
      WHERE university_id = 'TFU-AUTO-264943'
    `);
    console.log('Employee Record:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check employee:', e);
  } finally {
    await client.end();
  }
}

checkEmployee();
