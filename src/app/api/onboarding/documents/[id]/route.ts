import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(
      'SELECT od.*, os.tenant_id FROM onboarding_documents od JOIN onboarding_submissions os ON od.submission_id = os.id WHERE od.id = $1',
      [id]
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = result.rows[0];
    const filePath = doc.storage_path;

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const buffer = readFileSync(filePath);
    const ext = extname(doc.file_name).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    const url = new URL(request.url);
    const forceDownload = url.searchParams.get('download') === '1';
    const disposition = forceDownload
      ? `attachment; filename="${doc.file_name}"`
      : `inline; filename="${doc.file_name}"`;

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Document download error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
