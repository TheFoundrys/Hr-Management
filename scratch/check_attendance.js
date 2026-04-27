const { Client } = require('pg');
require('dotenv').config();

async function checkAttendance() {
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
      SELECT date, status 
      FROM attendance 
      WHERE employee_id = 'a3f1a791-8ad2-4d9c-940d-0ea86c64a7b1' 
      AND EXTRACT(MONTH FROM date) = 4 
      AND EXTRACT(YEAR FROM date) = 2026
    `);
    console.log('Attendance for Vishwanath (April 2026):');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check attendance:', e);
  } finally {
    await client.end();
  }
}

checkAttendance();
