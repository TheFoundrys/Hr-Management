import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');

    let filterClause = `WHERE tenant_id = $1`;
    const params: unknown[] = [tenantId];

    if (category) {
      params.push(category);
      filterClause += ` AND category = $${params.length}`;
    }
    if (userId) {
      params.push(userId);
      filterClause += ` AND user_id = $${params.length}`;
    }

    const result = await query(
      `SELECT * FROM documents ${filterClause} ORDER BY created_at DESC`,
      params
    );

    return NextResponse.json({ success: true, documents: result.rows });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const uploadedBy = request.headers.get('x-user-name') || 'system';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string;
    const category = formData.get('category') as string || 'OTHER';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Save file locally
    const uploadDir = join(process.cwd(), 'uploads', 'documents', tenantId);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const fileExt = extname(file.name);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buffer);

    // Store metadata in PostgreSQL
    const docId = uuidv4();
    await query(
      `INSERT INTO documents (id, user_id, tenant_id, file_name, file_type, file_size, storage_path, category, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [docId, userId, tenantId, file.name, file.type, file.size, filePath, category, uploadedBy]
    );

    return NextResponse.json({
      success: true,
      document: {
        id: docId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        category,
        uploadedBy,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Get document metadata
    const result = await query(
      `SELECT * FROM documents WHERE id = $1 AND tenant_id = $2`,
      [docId, tenantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = result.rows[0];

    // Delete file
    try {
      if (existsSync(doc.storage_path)) {
        unlinkSync(doc.storage_path);
      }
    } catch {
      console.warn('Could not delete file:', doc.storage_path);
    }

    // Delete DB record
    await query(`DELETE FROM documents WHERE id = $1`, [docId]);

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
