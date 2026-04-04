import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NextResponse } from 'next/server';
import { SchedulingEngine } from '@/lib/scheduling/schedulingEngine';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !['admin', 'hod'].includes(payload.role.toLowerCase())) {
      return NextResponse.json({ error: 'Unauthorized. Admin or HOD role required.' }, { status: 403 });
    }

    const body = await request.json();
    const { groupId } = body;

    const engine = new SchedulingEngine(payload.tenantId);
    
    // Generate the timetable for specific group or all
    const { timetable, unscheduled } = await engine.generateSchedule(groupId);

    // Save as draft
    if (timetable.length > 0) {
      await engine.saveDraft(timetable, payload.userId, groupId);
    }

    return NextResponse.json({
      success: true,
      summary: {
        scheduled: timetable.length,
        unscheduled: unscheduled.length,
        issues: unscheduled
      }
    });
  } catch (err) {
    console.error('Generation error:', err);
    return NextResponse.json({ error: 'Failed to generate timetable' }, { status: 500 });
  }
}
