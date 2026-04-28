import { query } from '../src/lib/db/postgres';

async function run() {
  try {
    const r = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leave_balances'
    `);
    console.log('Columns in leave_balances:');
    console.table(r.rows);
  } catch (e) {
    console.error('Error checking columns:', e);
  }
}

run();
