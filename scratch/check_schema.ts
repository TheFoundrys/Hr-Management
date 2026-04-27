import { query } from './src/lib/db/postgres';

async function checkSchema() {
  try {
    const res = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees'
    `, []);
    console.log('Employees table columns:');
    console.table(res.rows);
    
    const res2 = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attendance'
    `, []);
    console.log('Attendance table columns:');
    console.table(res2.rows);
  } catch (e) {
    console.error('Failed to check schema:', e);
  }
}

checkSchema();
