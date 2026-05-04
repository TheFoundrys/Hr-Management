import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

// GET — List all submissions for this tenant
export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);

    const result = await query(
      `SELECT os.*, ol.link_type, ol.token,
       (SELECT json_agg(json_build_object('id', od.id, 'doc_type', od.doc_type, 'file_name', od.file_name, 'file_size', od.file_size))
        FROM onboarding_documents od WHERE od.submission_id = os.id) as documents
       FROM onboarding_submissions os
       JOIN onboarding_links ol ON os.link_id = ol.id
       WHERE os.tenant_id = $1
       ORDER BY os.submitted_at DESC`,
      [tenantId]
    );

    return NextResponse.json({ success: true, submissions: result.rows });
  } catch (error: any) {
    console.error('Get submissions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — Update submission status (approve/reject)
export async function PATCH(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const { submissionId, status } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await query(
      'UPDATE onboarding_submissions SET status = $1, reviewed_at = NOW() WHERE id = $2 AND tenant_id = $3',
      [status, submissionId, tenantId]
    );

    if (status === 'approved') {
      const subRes = await query(
        `SELECT employee_id, first_name, last_name, email, phone_number, current_address, permanent_address,
                date_of_birth, blood_group
         FROM onboarding_submissions WHERE id = $1 AND tenant_id = $2`,
        [submissionId, tenantId]
      );
      const s = subRes.rows[0];
      if (s?.employee_id) {
        await query(
          `UPDATE employees SET
             first_name = COALESCE(NULLIF(TRIM($1), ''), first_name),
             last_name = COALESCE(NULLIF(TRIM($2), ''), last_name),
             email = COALESCE(NULLIF(TRIM($3), ''), email),
             phone = COALESCE(NULLIF(TRIM($4), ''), phone),
             address = COALESCE(NULLIF(TRIM($5), ''), address),
             permanent_address = COALESCE(NULLIF(TRIM($6), ''), permanent_address),
             date_of_birth = COALESCE($7::date, date_of_birth),
             blood_group = COALESCE(NULLIF(TRIM($8), ''), blood_group),
             updated_at = NOW()
           WHERE id = $9::uuid AND tenant_id = $10`,
          [
            s.first_name,
            s.last_name,
            s.email,
            s.phone_number,
            s.current_address,
            s.permanent_address,
            s.date_of_birth,
            s.blood_group,
            s.employee_id,
            tenantId,
          ]
        );
        const displayName = `${String(s.first_name || '').trim()} ${String(s.last_name || '').trim()}`.trim();
        if (displayName) {
          await query(
            `UPDATE users u SET name = $1, email = COALESCE(NULLIF(TRIM($2), ''), u.email), updated_at = NOW()
             FROM employees e
             WHERE e.id = $3::uuid AND e.tenant_id = $4 AND u.id = e.user_id`,
            [displayName, s.email, s.employee_id, tenantId]
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
