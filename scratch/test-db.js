const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'hr_management_system',
});

async function test() {
  try {
    console.log('Testing connection to:', process.env.POSTGRES_HOST || 'localhost');
    const result = await pool.query('SELECT NOW()');
    console.log('Success:', result.rows[0]);
  } catch (err) {
    console.error('Failure:', err);
  } finally {
    await pool.end();
  }
}

test();
