import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let queryString = 'SELECT * FROM attendance WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (employeeId) {
      queryString += ` AND employee_id = $${paramIndex++}`;
      params.push(employeeId);
    }
    if (status) {
      queryString += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (date) {
      queryString += ` AND date = $${paramIndex++}::DATE`;
      params.push(date);
    } else if (month && year) {
      queryString += ` AND EXTRACT(MONTH FROM date) = $${paramIndex++} AND EXTRACT(YEAR FROM date) = $${paramIndex++}`;
      params.push(parseInt(month), parseInt(year));
    }

    queryString += ' ORDER BY date DESC, employee_id ASC';
    const result = await query(queryString, params);

    // Map result columns to frontend-expected camelCase
    const attendance = result.rows.map(row => ({
      ...row,
      employeeId: row.employee_id,
      checkIn: row.check_in,
      checkOut: row.check_out,
      workingHours: row.working_hours,
      overtime: row.overtime
    }));

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const body = await request.json();
    const { employeeId, date, checkIn, checkOut, status, notes } = body;

    const workingHours = (checkIn && checkOut) 
      ? (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60)
      : 0;

    const result = await query(
      `INSERT INTO attendance (
        employee_id, tenant_id, date, check_in, check_out, status, notes, working_hours, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tenant_id, employee_id, date) DO UPDATE SET
        check_in = COALESCE(EXCLUDED.check_in, attendance.check_in),
        check_out = COALESCE(EXCLUDED.check_out, attendance.check_out),
        status = COALESCE(EXCLUDED.status, attendance.status),
        notes = COALESCE(EXCLUDED.notes, attendance.notes),
        working_hours = EXCLUDED.working_hours,
        source = 'manual',
        updated_at = NOW()
      RETURNING *`,
      [
        employeeId, tenantId, date, 
        checkIn ? new Date(checkIn) : null, 
        checkOut ? new Date(checkOut) : null,
        status || 'present', notes || '', workingHours, 'manual'
      ]
    );

    return NextResponse.json({ success: true, attendance: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create attendance error:', error);
    return NextResponse.json({ error: 'Failed to create attendance' }, { status: 500 });
  }
}
