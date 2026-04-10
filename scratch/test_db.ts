import { query } from '../src/lib/db/postgres';
import dotenv from 'dotenv';
dotenv.config();

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
