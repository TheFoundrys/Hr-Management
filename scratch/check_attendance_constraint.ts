import { query } from '../src/lib/db/postgres';

async function checkConstraint() {
  const result = await query(`
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conname = 'attendance_status_check'
  `);
  console.log(JSON.stringify(result.rows, null, 2));
}

checkConstraint();
