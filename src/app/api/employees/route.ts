import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { employeeSchema } from '@/lib/utils/validation';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let queryString = 'SELECT * FROM employees WHERE tenant_id = $1 AND is_active = true';
    const params: unknown[] = [tenantId];

    if (search) {
      params.push(`%${search}%`);
      queryString += ` AND (name ILIKE $2 OR email ILIKE $2 OR employee_id ILIKE $2 OR department ILIKE $2)`;
    }

    queryString += ' ORDER BY created_at DESC';
    const result = await query(queryString, params);

    // Map DB columns back to frontend-expected format
    const employees = result.rows.map(emp => ({
      ...emp,
      salary: {
        basic: emp.salary_basic,
        hra: emp.salary_hra,
        allowances: emp.salary_allowances,
        deductions: emp.salary_deductions
      }
    }));

    return NextResponse.json({ success: true, employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { employeeId, name, email, phone, role, department, designation, deviceUserId, tenantId, salary } = parsed.data;

    const result = await query(
      `INSERT INTO employees (
        employee_id, name, email, phone, role, department, designation, 
        device_user_id, tenant_id, salary_basic, salary_hra, salary_allowances, salary_deductions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        employeeId, name, email, phone, role, department, designation, 
        deviceUserId, tenantId, 
        salary?.basic || 0, salary?.hra || 0, salary?.allowances || 0, salary?.deductions || 0
      ]
    );

    return NextResponse.json({ success: true, employee: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Create employee error:', error);
    if (error.code === '23505') { // Postgres unique_violation
      return NextResponse.json({ error: 'Employee ID or Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { _id, ...updateData } = body; // _id from frontend potentially

    if (!_id && !updateData.employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { employeeId, name, email, phone, role, department, designation, deviceUserId, salary, isActive } = updateData;

    const result = await query(
      `UPDATE employees SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        role = COALESCE($4, role),
        department = COALESCE($5, department),
        designation = COALESCE($6, designation),
        device_user_id = COALESCE($7, device_user_id),
        salary_basic = COALESCE($8, salary_basic),
        salary_hra = COALESCE($9, salary_hra),
        salary_allowances = COALESCE($10, salary_allowances),
        salary_deductions = COALESCE($11, salary_deductions),
        is_active = COALESCE($12, is_active),
        updated_at = NOW()
      WHERE employee_id = $13 AND tenant_id = $14
      RETURNING *`,
      [
        name, email, phone, role, department, designation, deviceUserId,
        salary?.basic, salary?.hra, salary?.allowances, salary?.deductions,
        isActive, employeeId, tenantId
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Employee not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee: result.rows[0] });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const result = await query(
      'UPDATE employees SET is_active = false, updated_at = NOW() WHERE employee_id = $1 AND tenant_id = $2 RETURNING *',
      [id, tenantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Employee not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Employee deactivated' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
