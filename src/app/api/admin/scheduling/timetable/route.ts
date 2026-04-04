import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const facultyId = searchParams.get('facultyId');

    let q = `
      SELECT t.*, s.name as subject_name, c.name as course_name, 
             r.room_number, e.first_name || ' ' || e.last_name as faculty_name
      FROM timetable t
      JOIN subjects s ON t.subject_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN classrooms r ON t.classroom_id = r.id
      JOIN employees e ON t.faculty_id = e.id
      WHERE t.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (groupId) {
      q += ` AND s.group_id = $${params.length + 1}`;
      params.push(groupId);
    }
    if (facultyId) {
      q += ` AND t.faculty_id = $${params.length + 1}`;
      params.push(facultyId);
    }

    q += ` ORDER BY t.created_at`; // Note: actual day/time are in related tables if not here

    const { rows } = await query(q, params);
    return NextResponse.json({ success: true, entries: rows });
  } catch (error) {
    console.error('Timetable GET error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
