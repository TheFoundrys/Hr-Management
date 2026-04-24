import { query } from './postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function forceFix() {
  try {
    console.log('⚡ Running Force-Fix for Payroll Column...');
    await query(`ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT TRUE`);
    console.log('✅ Force-Fix Successful. Column is_paid added to leave_types.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Force-Fix Failed:', err);
    process.exit(1);
  }
}

forceFix();
