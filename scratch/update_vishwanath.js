const { Client } = require('pg');
require('dotenv').config();

async function updateSalary() {
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
    // Setting Basic to 10,000 (Locked) and HRA to 90,000 to reach 100,000 Gross
    const res = await client.query(`
      UPDATE employees 
      SET salary_basic = 10000, 
          salary_hra = 90000, 
          salary_allowances = 0,
          updated_at = NOW()
      WHERE university_id = 'TFU-AUTO-264943'
      RETURNING *
    `);
    console.log('Updated Employee Record:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to update employee:', e);
  } finally {
    await client.end();
  }
}

updateSalary();
