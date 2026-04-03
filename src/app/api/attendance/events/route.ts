import { attendanceEvents } from '@/lib/utils/events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { signal } = request;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const onAttendance = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      attendanceEvents.on('attendance_event', onAttendance);

      request.signal.addEventListener('abort', () => {
        attendanceEvents.off('attendance_event', onAttendance);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

import { NextResponse } from 'next/server';
