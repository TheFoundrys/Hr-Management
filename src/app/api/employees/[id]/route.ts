import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { tenantId } = payload;

    // Supports finding by UUID OR university_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const idField = isUuid ? 'e.id' : '(e.university_id = $1 OR e.employee_id = $1)';
    const queryParam = [id, tenantId];

    const result = await query(`
      SELECT e.*, d.name as department_name, ds.name as designation_name,
             m.first_name || ' ' || m.last_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE ${isUuid ? 'e.id = $1' : '(e.university_id = $1 OR e.employee_id = $1)'} AND e.tenant_id = $2
      LIMIT 1
    `, queryParam);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employee = result.rows[0];

    // Map to camelCase for frontend
    const mappedEmployee = {
      ...employee,
      universityId: employee.university_id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      department: employee.department_name,
      designation: employee.designation_name,
      managerName: employee.manager_name,
      salary: {
        basic: employee.salary_basic || 0,
        hra: employee.salary_hra || 0,
        allowances: employee.salary_allowances || 0,
        deductions: employee.salary_deductions || 0
      }
    };

    return NextResponse.json({ success: true, employee: mappedEmployee });
  } catch (error) {
    console.error('Fetch employee detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !['ADMIN', 'HR'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tenantId } = payload;

    // Supports finding by UUID OR university_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    
    // 1. Get current employee to ensure they exist and belong to the tenant
    const checkRes = await query(
      `SELECT id FROM employees WHERE ${isUuid ? 'id = $1' : 'university_id = $1'} AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employeeUuid = checkRes.rows[0].id;

    // 2. Perform Update
    const result = await query(
      `UPDATE employees SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        role = COALESCE($4, role),
        department_id = COALESCE($5, department_id),
        manager_id = COALESCE($6, manager_id),
        salary_basic = COALESCE($7, salary_basic),
        salary_hra = COALESCE($8, salary_hra),
        salary_allowances = COALESCE($9, salary_allowances),
        salary_deductions = COALESCE($10, salary_deductions),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *`,
      [
        body.firstName,
        body.lastName,
        body.email,
        body.role,
        body.departmentId || null,
        body.managerId || null,
        body.salary?.basic,
        body.salary?.hra,
        body.salary?.allowances,
        body.salary?.deductions,
        employeeUuid
      ]
    );

    return NextResponse.json({ success: true, employee: result.rows[0] });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

