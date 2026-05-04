import { query } from './postgres';

export async function setupDatabase() {
  try {
    console.log('🚀 Starting Database Security Setup...');

    // 1. Audit Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        old_value JSONB,
        new_value JSONB,
        ip_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Ensure the tenant_id column exists for old databases
    await query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID`);

    // 2. Leave Types - Ensure is_paid exists for Payroll
    await query(`ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT TRUE`);

    // 3. Rate Limits Table
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        ip TEXT PRIMARY KEY,
        attempts INTEGER DEFAULT 0,
        lockout_until TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 4. Performance Indexes
    await query('CREATE INDEX IF NOT EXISTS idx_attendance_composite ON attendance (employee_id, tenant_id, date)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_biometric_logs_conflict_target ON biometric_logs (device_user_id, timestamp, tenant_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_biometric_logs_lookup ON biometric_logs (tenant_id, timestamp, device_user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_biometric_logs_date_func ON biometric_logs (tenant_id, (DATE(timestamp)))');
    await query('CREATE INDEX IF NOT EXISTS idx_employees_biometric_mapping ON employees (tenant_id, biometric_id)');

    // WFH requests (see migrations/add_wfh_requests.sql — kept in sync)
    await query(`
      CREATE TABLE IF NOT EXISTS wfh_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        request_date DATE NOT NULL,
        is_half_day BOOLEAN DEFAULT FALSE,
        half_day_type VARCHAR(10) CHECK (half_day_type IS NULL OR half_day_type IN ('morning', 'afternoon')),
        reason TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_wfh_tenant_status ON wfh_requests(tenant_id, status)');
    await query('CREATE INDEX IF NOT EXISTS idx_wfh_employee_date ON wfh_requests(employee_id, request_date)');

    console.log('✅ Database Security & Performance Verified.');
  } catch (error) {
    console.error('❌ Database Setup Failed:', error);
  }
}
