import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB || '10')) * 1024 * 1024;

const DOC_TYPES = [
  'aadharPan', 'payslips', 'educationalCertificates',
  'previousOfferLetter', 'relievingExperienceLetters', 'appraisalHikeLetters', 'photo', 'resume'
];

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    // 1. Validate the link
    const linkRes = await query(
      'SELECT * FROM onboarding_links WHERE token = $1', [token]
    );
    if (!linkRes.rowCount) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
    }
    const link = linkRes.rows[0];

    if (link.status === 'submitted') {
      return NextResponse.json({ error: 'Onboarding already submitted via this link' }, { status: 400 });
    }
    if (link.status === 'revoked') {
      return NextResponse.json({ error: 'This link has been revoked' }, { status: 400 });
    }
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 400 });
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const currentAddress = formData.get('currentAddress') as string;
    const permanentAddress = formData.get('permanentAddress') as string;
    const dateOfBirth = formData.get('dateOfBirth') as string;
    const emergencyContact = formData.get('emergencyContact') as string;
    const bloodGroup = formData.get('bloodGroup') as string;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    // 3. Check email uniqueness for generic links
    if (link.link_type === 'generic') {
      const emailCheck = await query('SELECT id FROM employees WHERE email = $1 AND tenant_id = $2', [email, link.tenant_id]);
      if (emailCheck.rowCount && emailCheck.rowCount > 0) {
        return NextResponse.json({ error: 'An employee with this email already exists' }, { status: 400 });
      }
    }

    // 4. Create employee record if generic, or get existing
    let employeeId = link.employee_id;

    if (!employeeId) {
      // Generic link — create new employee
      const empCode = `ONB-${Date.now().toString().slice(-6)}`;
      const insertRes = await query(
        `INSERT INTO employees (university_id, first_name, last_name, email, phone, tenant_id, is_active, join_date)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_DATE)
         RETURNING id`,
        [empCode, firstName, lastName, email, phoneNumber, link.tenant_id]
      );
      employeeId = insertRes.rows[0].id;
    }

    // 5. Create submission record
    const subRes = await query(
      `INSERT INTO onboarding_submissions
       (tenant_id, link_id, employee_id, first_name, last_name, email, phone_number, current_address, permanent_address, date_of_birth, emergency_contact, blood_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [link.tenant_id, link.id, employeeId, firstName, lastName, email, phoneNumber, currentAddress, permanentAddress, dateOfBirth || null, emergencyContact, bloodGroup]
    );
    const submissionId = subRes.rows[0].id;

    // 6. Save uploaded files
    const uploadDir = join(process.cwd(), 'uploads', 'onboarding', submissionId);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    for (const docType of DOC_TYPES) {
      const file = formData.get(docType) as File | null;
      if (!file || typeof file === 'string') continue;

      const ext = extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) continue;
      if (file.size > MAX_FILE_SIZE) continue;

      const fileName = `${docType}_${uuidv4()}${ext}`;
      const filePath = join(uploadDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      writeFileSync(filePath, buffer);

      await query(
        `INSERT INTO onboarding_documents (submission_id, doc_type, file_name, file_size, storage_path)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (submission_id, doc_type) DO UPDATE SET file_name = $3, file_size = $4, storage_path = $5, uploaded_at = NOW()`,
        [submissionId, docType, file.name, file.size, filePath]
      );
    }

    // 7. Mark link as submitted
    await query('UPDATE onboarding_links SET status = $1 WHERE id = $2', ['submitted', link.id]);

    return NextResponse.json({ success: true, message: 'Onboarding submitted successfully', submissionId });
  } catch (error: any) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
