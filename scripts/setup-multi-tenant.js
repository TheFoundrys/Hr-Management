const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
});

async function resetAndSetup() {
  console.log('🚮 Performing comprehensive data wipe...');

  try {
    // 1. Clear ALL tables including device mappings
    try {
        await pool.query('TRUNCATE TABLE audit_logs, rate_limits, documents, leaves, attendance, users, employees, designations, departments, tenants, tenant_devices, tenant_users CASCADE');
        console.log('✅ All tables truncated (CASCADE).');
    } catch (e) {
        console.warn('⚠️ Truncate failed, falling back to ordered DELETE:', e.message);
        const tables = [
          'audit_logs', 'rate_limits', 'documents', 'leaves', 'attendance',
          'tenant_users', 'tenant_devices', 'users', 'employees', 
          'designations', 'departments', 'tenants'
        ];
        
        await pool.query('UPDATE users SET employee_id = NULL');
        await pool.query('UPDATE employees SET user_id = NULL');
        
        for (const table of tables) {
          try {
            await pool.query(`DELETE FROM ${table}`);
            console.log(`✅ Cleared ${table}`);
          } catch (e2) {
            console.warn(`❌ Could not clear ${table}:`, e2.message);
          }
        }
    }

    // 2. Add SUPER_ADMIN to role constraint
    try {
        await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
        await pool.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'HR', 'HOD', 'STAFF', 'FACULTY', 'NON_TEACHING', 'PENDING'))");
    } catch (e) {}

    // 3. Create the System Tenant
    const tenantRes = await pool.query(
      "INSERT INTO tenants (name, subdomain) VALUES ('System Administration', 'system') RETURNING id"
    );
    const tenantId = tenantRes.rows[0].id;

    // 4. Create the Super Admin: admin / password
    const hash = await bcrypt.hash('password', 10);
    
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role, tenant_id, is_active, is_verified) VALUES ($1, $2, $3, $4, $5, true, true)",
      ['System Super User', 'admin', hash, 'SUPER_ADMIN', tenantId]
    );

    console.log('\n✨ Database Reset Complete!');
    console.log('Super Admin: admin / password\n');

  } catch (err) {
    console.error('❌ Reset failed:', err);
  } finally {
    await pool.end();
  }
}

resetAndSetup();
