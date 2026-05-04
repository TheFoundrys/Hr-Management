import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../src/lib/db/postgres';
import { importTemplate } from '../services/templateImport';

export async function handleTenantOnboard(req: any) {
  const { org, admin, hierarchy, modules, structure } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Tenant row
    const tenantId = uuidv4();
    const settings = {
      hierarchy: {
        reporting_type: hierarchy.reporting_type || 'linear',
        require_dept_head: hierarchy.require_dept_head || false,
        label_vocabulary: hierarchy.label_vocabulary || 'corporate',
        custom_labels: hierarchy.label_vocabulary === 'custom' ? hierarchy.custom_labels : {}
      },
      modules: {
        leave: modules.leave || modules.leave_management || false,
        attendance: modules.attendance || false,
        payroll: modules.payroll || false,
        performance: modules.performance || modules.performance_review || false,
        recruitment: modules.recruitment || false,
        documents: modules.documents || false
      },
      branding: {
        logo_url: org.logo_url || null,
        accent_color: org.accent_color || '#2563eb', // Default blue
        app_name: org.app_name || org.name
      },
      onboarding: {
        structure_source: structure.source || 'scratch',
        template_used: structure.template_id || null,
        completed: false
      },
      leave_policy: {
        advance_notice_days: 0,
        max_consecutive_days: 0,
        dept_max_concurrent_approved: 2,
        sick_leave_max_days_without_certificate: 2,
        summary_text:
          'Apply in advance where required; sick leave may need a medical certificate for longer spans. Half-day leaves support morning or afternoon sessions.',
      },
    };

    const subdomain = org.subdomain || org.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const tenantQuery = `
      INSERT INTO tenants (
        id, name, subdomain, org_type, org_size, address, country, 
        timezone, logo_url, settings, tenant_type, onboarded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id
    `;
    
    // Normalize tenant_type based on org_type if not provided
    const tenantType = org.tenant_type || (['university', 'school', 'college'].includes(org.org_type) ? 'EDUCATION' : 'COMPANY');
    
    await client.query(tenantQuery, [
      tenantId, org.name, subdomain, org.org_type, org.org_size, 
      org.address, org.country, org.timezone || 'Asia/Kolkata', 
      org.logo_url, JSON.stringify(settings), tenantType
    ]);

    // 2. Hash Admin Password
    const passwordHash = await bcrypt.hash(admin.password, 12);

    // 3. Create Org Admin User
    const adminId = uuidv4();
    const userQuery = `
      INSERT INTO users (
        id, tenant_id, email, password_hash, name, role, is_active, is_verified
      ) VALUES ($1, $2, $3, $4, $5, 'ADMIN', true, true)
      RETURNING id
    `;
    
    await client.query(userQuery, [
      adminId, tenantId, admin.email, passwordHash, admin.full_name
    ]);

    // 4. Create Employee record for Admin
    const employeeId = uuidv4();
    await client.query(
      `INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, email, university_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [employeeId, tenantId, adminId, admin.full_name.split(' ')[0], admin.full_name.split(' ')[1] || '', admin.email, 'ADMIN-001']
    );

    // 5. Template Import (if requested)
    if (structure.source === 'template' && structure.template_id) {
      await importTemplate(tenantId, structure.template_id, client);
    }

    // 6. Mark onboarding as completed
    await client.query(
      `UPDATE tenants 
       SET settings = jsonb_set(settings, '{onboarding,completed}', 'true'::jsonb)
       WHERE id = $1`,
      [tenantId]
    );

    await client.query('COMMIT');

    return {
      status: 201,
      data: {
        tenant_id: tenantId,
        admin_id: adminId,
        onboarding_complete: true
      }
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Onboarding Error:', error);
    throw error;
  } finally {
    client.release();
  }
}
