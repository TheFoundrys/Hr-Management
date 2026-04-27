const { Client } = require('pg');
require('dotenv').config();

async function checkUsers() {
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
      SELECT id, email, role, tenant_id, employee_id 
      FROM users 
      WHERE role = 'ADMIN'
    `);
    console.log('Users with ADMIN role:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check users:', e);
  } finally {
    await client.end();
  }
}

checkUsers();
