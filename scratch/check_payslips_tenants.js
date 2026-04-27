const { Client } = require('pg');
require('dotenv').config();

async function checkPayslipsTenants() {
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
      SELECT DISTINCT tenant_id FROM payslip_records
    `);
    console.log('Unique Tenant IDs in Payslip Records:');
    console.table(res.rows);
  } catch (e) {
    console.error('Failed to check tenants:', e);
  } finally {
    await client.end();
  }
}

checkPayslipsTenants();
