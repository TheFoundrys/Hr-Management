const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Kolkata'");
});

async function test() {
  console.log('Testing connection to:', process.env.POSTGRES_HOST);
  try {
    const resCount = await pool.query('SELECT count(*) FROM pg_stat_activity');
    console.log('Active connections on server:', resCount.rows[0].count);

    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      const qStart = Date.now();
      await pool.query('SELECT 1');
      console.log(`Query ${i+1} took:`, Date.now() - qStart, 'ms');
    }
    console.log('Total time for 5 queries:', Date.now() - start, 'ms');
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await pool.end();
  }
}

test();
