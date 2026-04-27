const { Client } = require('pg');
require('dotenv').config();

async function checkAdmins() {
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
      SELECT id, first_name, last_name, role, university_id 
      FROM employees 
      WHERE role = 'ADMIN'
    `);
    console.log('Admin Employees:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check admins:', e);
  } finally {
    await client.end();
  }
}

checkAdmins();
