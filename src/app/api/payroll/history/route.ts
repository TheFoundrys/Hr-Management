import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized credentials' }, { status: 401 });
    }

    // 1. Get user details and resolve identity
    const userResult = await query('SELECT id, name, email, employee_id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Identity mismatch' }, { status: 404 });
    }

    let activeEmployeeId = user.employee_id;

    // 2. Self-Healing: If employee_id is missing, try to resolve from employees table or auto-onboard
    if (!activeEmployeeId) {
      const empResult = await query('SELECT employee_id FROM employees WHERE email = $1 AND tenant_id = $2', [user.email, tenantId]);
      
      if (empResult.rowCount && empResult.rowCount > 0) {
        activeEmployeeId = empResult.rows[0].employee_id;
        // Update user record for future requests
        await query('UPDATE users SET employee_id = $1 WHERE id = $2', [activeEmployeeId, userId]);
      } else {
        // Create an identity if absolutely none exists
        const newEmpId = `TFU-AUTO-${Date.now().toString().slice(-6)}`;
        const names = user.name.split(' ');
        const firstName = names[0];
        const lastName = names.slice(1).join(' ') || 'User';
        const defaultDept = '0bd710c2-bb92-4c77-a67f-013573f25cc0'; // Mathematics

        await query(
          `INSERT INTO employees (employee_id, university_id, first_name, last_name, email, tenant_id, department_id, user_id, is_active)
           VALUES ($1, $1, $2, $3, $4, $5, $6, $7, true)`,
          [newEmpId, firstName, lastName, user.email, tenantId, defaultDept, userId]
        );
        await query('UPDATE users SET employee_id = $1 WHERE id = $2', [newEmpId, userId]);
        activeEmployeeId = newEmpId;
      }
    }

    // 3. SECURE FETCH: Get payslip records using the resolved employee ID
    const result = await query(
      `SELECT * FROM payslip_records 
       WHERE user_id = $1 AND tenant_id = $2 
       ORDER BY year DESC, month DESC`,
      [activeEmployeeId, tenantId]
    );

    return NextResponse.json({ success: true, payslips: result.rows });
  } catch (error) {
    console.error('Payslip history error:', error);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
