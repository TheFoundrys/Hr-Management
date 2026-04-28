import { query } from '../src/lib/db/postgres';

async function checkSchema() {
  const result = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'leave_requests'
  `);
  console.log(JSON.stringify(result.rows, null, 2));
}

checkSchema();
