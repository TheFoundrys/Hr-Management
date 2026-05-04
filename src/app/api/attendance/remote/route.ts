import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { type, metadata } = await request.json(); // type: 'in' or 'out'
    const tenantId = payload.tenantId;
    let employeeId = payload.internalEmployeeId;

    // Fallback: If token is old and doesn't have internalEmployeeId, fetch it
    if (!employeeId) {
      const empRes = await query('SELECT id FROM employees WHERE user_id = $1', [payload.userId]);
      if (empRes.rows.length > 0) employeeId = empRes.rows[0].id;
    }

    if (!employeeId) return NextResponse.json({ error: 'Employee profile not found' }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];
    const existingRes = await query(
      'SELECT id, check_in, check_out, remote_metadata, working_hours FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    let record = existingRes.rows[0];
    let remoteMetadata = record?.remote_metadata || { sessions: [] };
    if (typeof remoteMetadata === 'string') remoteMetadata = JSON.parse(remoteMetadata);
    if (!remoteMetadata.sessions) remoteMetadata.sessions = [];

    if (type === 'in') {
      // Check if already in an active remote session
      const activeSession = remoteMetadata.sessions.find((s: any) => !s.out);
      if (activeSession) return NextResponse.json({ error: 'A remote session is already active' }, { status: 400 });

      remoteMetadata.sessions.push({ in: new Date().toISOString(), metadata });

      if (!record) {
        // Create new record (FIFO: first check_in)
        await query(`
          INSERT INTO attendance (employee_id, tenant_id, date, check_in, status, source, is_remote, remote_metadata)
          VALUES ($1, $2, $3, NOW(), 'present', 'web', true, $4)
        `, [employeeId, tenantId, today, JSON.stringify(remoteMetadata)]);
      } else {
        // Update existing record (FIFO: don't change check_in if already exists)
        await query(`
          UPDATE attendance 
          SET remote_metadata = $1, is_remote = true, updated_at = NOW() 
          WHERE id = $2
        `, [JSON.stringify(remoteMetadata), record.id]);
      }
    } else if (type === 'out') {
      const activeSessionIndex = remoteMetadata.sessions.findIndex((s: any) => !s.out);
      if (activeSessionIndex === -1) {
        // If no active remote session but we are clocking out, maybe they want to close the day
        if (!record) return NextResponse.json({ error: 'No attendance record found for today' }, { status: 400 });
      } else {
        remoteMetadata.sessions[activeSessionIndex].out = new Date().toISOString();
      }

      // Calculate total remote hours from sessions
      let totalSeconds = 0;
      remoteMetadata.sessions.forEach((s: any) => {
        if (s.in && s.out) {
          totalSeconds += (new Date(s.out).getTime() - new Date(s.in).getTime()) / 1000;
        }
      });
      const totalHours = totalSeconds / 3600;

      // LIFO: check_out is always updated to the latest
      await query(`
        UPDATE attendance 
        SET check_out = NOW(), 
            updated_at = NOW(), 
            remote_metadata = $1,
            working_hours = $2
        WHERE id = $3
      `, [JSON.stringify(remoteMetadata), totalHours, record.id]);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Remote Attendance API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];
    let employeeId = payload.internalEmployeeId;

    if (!employeeId) {
      const empRes = await query('SELECT id FROM employees WHERE user_id = $1', [payload.userId]);
      if (empRes.rows.length > 0) employeeId = empRes.rows[0].id;
    }

    if (!employeeId) return NextResponse.json({ success: true, attendance: null });

    const res = await query(
      `SELECT id, date, check_in, check_out, remote_metadata, is_remote, working_hours, status, source
       FROM attendance WHERE employee_id = $1 AND date = $2`,
      [employeeId, today]
    );

    let attendance = res.rows[0] || null;
    if (attendance?.remote_metadata && typeof attendance.remote_metadata === 'string') {
      try {
        attendance = { ...attendance, remote_metadata: JSON.parse(attendance.remote_metadata) };
      } catch {
        attendance = { ...attendance, remote_metadata: { sessions: [] } };
      }
    }
    if (attendance && attendance.remote_metadata && typeof attendance.remote_metadata === 'object') {
      const rm = attendance.remote_metadata as { sessions?: unknown[] };
      if (!Array.isArray(rm.sessions)) rm.sessions = [];
    }

    return NextResponse.json({
      success: true,
      attendance,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
