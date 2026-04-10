const { query } = require('./src/lib/db/postgres');
const env = require('dotenv');
env.config();

async function test() {
  try {
    const res = await query('SELECT NOW()');
    console.log('✅ DB Connected:', res.rows[0]);
  } catch (err) {
    console.error('❌ DB Connection Failed:', err);
  } finally {
    process.exit();
  }
}

test();
