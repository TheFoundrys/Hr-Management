const { Client } = require('pg');
require('dotenv').config();

async function checkTenants() {
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
      SELECT DISTINCT tenant_id FROM employees
    `);
    console.log('Unique Tenant IDs in Employees Table:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check tenants:', e);
  } finally {
    await client.end();
  }
}

checkTenants();
