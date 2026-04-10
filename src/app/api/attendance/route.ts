import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Join with employees and tenant_users to get hardware mapping
    let queryString = `
      SELECT a.*, e.university_id, e.first_name, e.last_name, tu.device_user_id 
      FROM attendance a 
      JOIN employees e ON a.employee_id = e.id 
      LEFT JOIN tenant_users tu ON e.user_id = tu.user_id
      WHERE e.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (employeeId) {
      queryString += ` AND e.employee_id = $${paramIndex++}`;
      params.push(employeeId);
    }
    if (status) {
      queryString += ` AND a.status = $${paramIndex++}`;
      params.push(status.toUpperCase());
    }

    if (date) {
      queryString += ` AND a.date = $${paramIndex++}::DATE`;
      params.push(date);
    } else if (month && year) {
      queryString += ` AND EXTRACT(MONTH FROM a.date) = $${paramIndex++} AND EXTRACT(YEAR FROM a.date) = $${paramIndex++}`;
      params.push(parseInt(month), parseInt(year));
    }

    queryString += ' ORDER BY a.date DESC, a.employee_id ASC';
    const result = await query(queryString, params);

    // Map result columns to frontend-expected camelCase
    const attendance = result.rows.map(row => ({
      ...row,
      employeeId: row.university_id || row.employee_id, // Use human readable ID if available
      deviceUserId: row.device_user_id || row.university_id || '—',
      internalId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      status: (row.status || 'absent').toLowerCase(),
      checkIn: row.check_in,
      checkOut: row.check_out,
      workingHours: (() => {
        if (row.check_in && row.check_out) {
          return Math.round((new Date(row.check_out).getTime() - new Date(row.check_in).getTime()) / (1000 * 60 * 60) * 100) / 100;
        }
        if (row.check_in && !row.check_out && new Date(row.date).toDateString() === new Date().toDateString()) {
           // Live counter for today only
           return Math.round((new Date().getTime() - new Date(row.check_in).getTime()) / (1000 * 60 * 60) * 100) / 100;
        }
        return Number(row.working_hours || 0);
      })(),
      source: row.source
    }));

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const body = await request.json();
    const { employeeId, date, checkIn, checkOut, status, notes } = body;

    const workingHours = (checkIn && checkOut) 
      ? (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60)
      : 0;

    const result = await query(
      `INSERT INTO attendance (
        employee_id, tenant_id, date, check_in, check_out, status, notes, working_hours, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (employee_id, tenant_id, date) DO UPDATE SET
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
        (status || 'PRESENT').toUpperCase(), notes || '', workingHours, 'manual'
      ]
    );

    return NextResponse.json({ success: true, attendance: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create attendance error:', error);
    return NextResponse.json({ error: 'Failed to create attendance' }, { status: 500 });
  }
}
