import { query } from '@/lib/db/postgres';

/**
 * Older DBs created `audit_logs` via `api/admin/migrate` with columns
 * `(action, performed_by, target_id, details)` — no `user_id` / `entity_type` / etc.
 * `CREATE TABLE IF NOT EXISTS` does not add columns to an existing table, so we
 * align the live schema before insert.
 */
async function ensureAuditLogColumns() {
  const alters = [
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id TEXT`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT`,
  ];
  for (const sql of alters) {
    await query(sql);
  }
}

export async function logAudit({
  tenantId,
  userId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
  ipAddress
}: {
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}) {
  try {
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

    await ensureAuditLogColumns();

    await query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenantId, userId ?? null, action, entityType, entityId ?? null, oldValue ?? null, newValue ?? null, ipAddress ?? null]
    );
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}
