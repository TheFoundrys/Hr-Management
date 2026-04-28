import { query } from '../src/lib/db/postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkEmployeeSchema() {
  const result = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'employees'
  `);
  console.log(JSON.stringify(result.rows, null, 2));
}

checkEmployeeSchema();
