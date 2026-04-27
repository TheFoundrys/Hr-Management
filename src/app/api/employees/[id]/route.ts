import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/rbac';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { tenantId } = payload;

    // Supports finding by UUID OR university_id/employee_id
    // More permissive UUID regex or simple length check can be used, but let's just try to be more robust
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    const result = await query(`
      SELECT e.*, d.name as department_name, ds.name as designation_name,
             COALESCE(m.first_name, '') || ' ' || COALESCE(m.last_name, '') as manager_name,
             m.employee_id as manager_employee_id
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE ${isUuid ? 'e.id = $1' : '(e.university_id = $1 OR e.employee_id = $1)'} AND e.tenant_id = $2
      LIMIT 1
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employee = result.rows[0];

    // Calculate real-time stats for the current month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 END) as present_days,
        SUM(working_hours) as total_hours
       FROM attendance 
       WHERE employee_id = $1 AND date >= $2`,
      [employee.id, firstOfMonth]
    );

    const stats = statsResult.rows[0] || { total_days: 0, present_days: 0, total_hours: 0 };
    const presentDays = parseInt(stats.present_days || 0);
    const totalDays = parseInt(stats.total_days || 0);
    const totalHours = parseFloat(stats.total_hours || 0);

    // Logic: 8 hours per day expected
    const expectedHours = totalDays * 8;
    const efficiency = expectedHours > 0 ? Math.min(100, Math.round((totalHours / expectedHours) * 100)) : 100;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // Calculate dynamic deduction (e.g., LOP for missed hours/days)
    const basic = Number(employee.salary_basic || 0);
    const hra = Number(employee.salary_hra || 0);
    const allowances = Number(employee.salary_allowances || 0);
    const deductions = Number(employee.salary_deductions || 0);
    
    const totalGross = basic + hra + allowances;
    const perDaySalary = totalGross / 30;
    const absentDays = totalDays - presentDays;
    const accruedDeduction = (absentDays * perDaySalary) + deductions;

    // Map and sanitize salary fields
    const salary = {
      basic,
      hra,
      allowances,
      deductions: Math.max(deductions, Math.round(accruedDeduction))
    };

    // Map to camelCase for frontend
    const mappedEmployee = {
      ...employee,
      name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
      status: employee.is_active ? 'active' : 'inactive',
      universityId: employee.university_id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      department: employee.department_name,
      designation: employee.designation_name,
      managerName: employee.manager_name?.trim() || 'N/A',
      manager_employee_id: employee.manager_employee_id,
      joinDate: employee.join_date || employee.created_at,
      salary,
      metrics: {
        efficiency,
        attendance: attendanceRate
      }
    };

    return NextResponse.json({ success: true, employee: mappedEmployee });
  } catch (error: any) {
    console.error('Fetch employee detail error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch employee', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}


export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'MANAGE_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden. Elevated privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tenantId } = payload;

    // Supports finding by UUID OR university_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 1. Get current employee to ensure they exist and belong to the tenant
    const checkRes = await query(
      `SELECT id FROM employees WHERE ${isUuid ? 'id = $1' : 'university_id = $1'} AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employeeUuid = checkRes.rows[0].id;

    // Handle name splitting
    // If 'name' is provided, it should override firstName/lastName to ensure UI edits persist
    let { firstName, lastName } = body;
    if (body.name) {
      const parts = body.name.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || '';
    }

    // 2. Perform Update
    const result = await query(
      `UPDATE employees SET
        first_name = COALESCE($1, first_name),

        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        role = COALESCE($4, role),
        department_id = $5,
        manager_id = $6,
        salary_basic = COALESCE($7, salary_basic),
        salary_hra = COALESCE($8, salary_hra),
        salary_allowances = COALESCE($9, salary_allowances),
        salary_deductions = COALESCE($10, salary_deductions),
        designation_id = $12,
        is_active = COALESCE($13, is_active),
        phone = COALESCE($14, phone),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *`,
      [
        firstName,
        lastName,
        body.email,
        body.role,
        body.departmentId || body.department_id || null,
        body.managerId || body.reportsToId || body.reports_to_id || body.manager_id || null,
        body.salary?.basic ?? body.salary_basic,
        body.salary?.hra ?? body.salary_hra,
        body.salary?.allowances ?? body.salary_allowances,
        body.salary?.deductions ?? body.salary_deductions,
        employeeUuid,
        body.designationId || body.designation_id || null,
        body.status === undefined ? undefined : (body.status === 'active' || body.status === true),
        body.phone,
      ]
    );


    return NextResponse.json({ success: true, employee: result.rows[0] });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'MANAGE_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden. Elevated privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const { tenantId } = payload;

    // 1. Find employee to get necessary identifiers (id, email, employee_id)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    const empRes = await query(
      `SELECT id, email, university_id, employee_id FROM employees 
       WHERE ${isUuid ? 'id = $1' : '(university_id = $1 OR employee_id = $1)'} AND tenant_id = $2`,
      [id, tenantId]
    );

    if (empRes.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employee = empRes.rows[0];

    // 2. Delete dependent records (to avoid foreign key violations)
    // Delete from users (references employee_id/university_id)
    await query(
      `DELETE FROM users WHERE (email = $1 OR employee_id = $2) AND tenant_id = $3`,
      [employee.email, employee.employee_id || employee.university_id, tenantId]
    );

    // Delete from attendance (references id)
    await query(
      `DELETE FROM attendance WHERE employee_id = $1`,
      [employee.id]
    );

    // Delete from leave_requests (references id)
    await query(
      `DELETE FROM leave_requests WHERE employee_id = $1`,
      [employee.id]
    );

    // 3. Finally delete from employees
    const result = await query(
      `DELETE FROM employees WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [employee.id, tenantId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Employee and associated user records removed successfully' 
    });
  } catch (error: any) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete employee', 
      details: error.message 
    }, { status: 500 });
  }
}


