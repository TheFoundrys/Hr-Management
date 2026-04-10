import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function POST() {
  try {
    // 1. Drop old role CHECK constraints on users table
    const userConstraints = await query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND contype = 'c'
    `);
    for (const row of userConstraints.rows) {
      await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }

    // 2. Drop old role CHECK constraints on employees table
    const empConstraints = await query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'employees'::regclass AND contype = 'c'
    `);
    for (const row of empConstraints.rows) {
      await query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }

    // 3. Create audit_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(255) NOT NULL,
        performed_by UUID,
        target_id UUID,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 4. Create rate_limits table
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        ip VARCHAR(45) PRIMARY KEY,
        attempts INT DEFAULT 1,
        lockout_until TIMESTAMP
      )
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Migration complete. Removed legacy role constraints, created audit_logs and rate_limits tables.',
      dropped_user_constraints: userConstraints.rows.map((r: any) => r.conname),
      dropped_emp_constraints: empConstraints.rows.map((r: any) => r.conname),
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
