import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    let userId = request.headers.get('x-user-id');
    let userRole = request.headers.get('x-user-role');

    // Fallback: Verify token directly if headers are missing
    if (!userId) {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth-token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
          userId = payload.userId;
          userRole = payload.role;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized credentials' }, { status: 401 });
    }

    // 1. Resolve User and current Employee pointer
    const userResult = await query(
      `SELECT u.id, u.name, u.email, u.employee_id, u.role, u.tenant_id, t.tenant_type 
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1 AND u.tenant_id = $2`, 
      [userId, tenantId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Identity mismatch' }, { status: 404 });
    }

    const email = user.email;
    const empIdStr = user.employee_id;

    // 2. Fetch Employee record joined with Department/Designation
    let result = await query(
      `SELECT e.*, d.name as department_name, ds.name as designation_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations ds ON e.designation_id = ds.id
       WHERE (e.university_id = $1 OR e.email = $2) AND e.tenant_id = $3 LIMIT 1`,
      [empIdStr, email, tenantId]
    );

    // 3. SELF-HEALING: Auto-onboard if personnel record is missing
    if (result.rowCount === 0) {
      const names = user.name.split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || 'User';
      const newEmpId = empIdStr || `TFU-AUTO-${Date.now().toString().slice(-6)}`;
      
      // Dynamically find a department if one exists, otherwise null
      const deptRes = await query('SELECT id FROM departments WHERE tenant_id = $1 LIMIT 1', [tenantId]);
      const defaultDept = deptRes.rows[0]?.id || null;

      await query(
        `INSERT INTO employees (id, employee_id, university_id, first_name, last_name, email, tenant_id, department_id, user_id, is_active, role)
         VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, true, $9)
         ON CONFLICT (email, tenant_id) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [crypto.randomUUID(), newEmpId, firstName, lastName, email, tenantId, defaultDept, userId, userRole]
      );

      // Link User record if it wasn't already
      await query('UPDATE users SET employee_id = $1, is_active = true WHERE id = $2', [newEmpId, userId]);

      // Re-fetch the healed record
      result = await query(
        `SELECT e.*, d.name as department_name, ds.name as designation_name
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations ds ON e.designation_id = ds.id
         WHERE e.email = $1 AND e.tenant_id = $2 LIMIT 1`,
        [email, tenantId]
      );
    }

    const emp = result.rows[0];
    const bankAcc = emp.bank_account || '';
    const maskedAccount = bankAcc.length > 4 ? `****-****-${bankAcc.slice(-4)}` : bankAcc;

    const employee = {
      ...emp,
      name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      firstName: emp.first_name,
      middleName: emp.middle_name,
      lastName: emp.last_name,
      displayName: emp.display_name,
      gender: emp.gender,
      dateOfBirth: emp.date_of_birth,
      maritalStatus: emp.marital_status,
      bloodGroup: emp.blood_group,
      physicallyHandicapped: emp.physically_handicapped,
      nationality: emp.nationality,
      personalEmail: emp.personal_email,
      workPhone: emp.work_phone,
      residencePhone: emp.residence_phone,
      address: emp.address,
      permanentAddress: emp.permanent_address,
      professionalSummary: emp.professional_summary,
      aadhaarNumber: emp.aadhaar_number,
      panNumber: emp.pan_number,
      eduDegree: emp.edu_degree,
      eduUni: emp.edu_uni,
      eduBranch: emp.edu_branch,
      eduCgpa: emp.edu_cgpa,
      eduJoin: emp.edu_join,
      eduEnd: emp.edu_end,
      education: emp.education || [],
      experience: emp.experience || [],
      identityInfo: emp.identity_info || {},
      employee_id: emp.employee_id,
      university_id: emp.university_id,
      department: emp.department_name || 'N/A',
      designation: emp.designation_name || 'N/A',
      role: userRole || emp.role,
      tenantType: user.tenant_type,
      bank_account: maskedAccount,
      joinDate: emp.join_date || emp.created_at,
      salary: {
        basic: Number(emp.salary_basic || 0),
        hra: Number(emp.salary_hra || 0),
        allowances: Number(emp.salary_allowances || 0),
        deductions: Number(emp.salary_deductions || 0)
      }
    };

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('SYSTEM ERROR [Profile Resolution]:', error);
    return NextResponse.json({ error: 'Internal system fault resolution failed.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const body = await request.json();
    
    // Whitelist of allowed fields for user self-edit
    const allowedFields: Record<string, string> = {
      firstName: 'first_name',
      middleName: 'middle_name',
      lastName: 'last_name',
      displayName: 'display_name',
      gender: 'gender',
      dateOfBirth: 'date_of_birth',
      maritalStatus: 'marital_status',
      bloodGroup: 'blood_group',
      physicallyHandicapped: 'physically_handicapped',
      nationality: 'nationality',
      personalEmail: 'personal_email',
      phone: 'phone',
      workPhone: 'work_phone',
      residencePhone: 'residence_phone',
      address: 'address',
      permanentAddress: 'permanent_address',
      professionalSummary: 'professional_summary',
      aadhaarNumber: 'aadhaar_number',
      panNumber: 'pan_number',
      eduDegree: 'edu_degree',
      eduUni: 'edu_uni',
      eduBranch: 'edu_branch',
      eduCgpa: 'edu_cgpa',
      eduJoin: 'edu_join',
      eduEnd: 'edu_end',
      education: 'education',
      experience: 'experience',
      identityInfo: 'identity_info'
    };

    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields[key]) {
        updates.push(`${allowedFields[key]} = $${i++}`);
        // Handle JSONB fields
        if (['education', 'experience', 'identityInfo'].includes(key)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    values.push(payload.email, tenantId);
    const queryStr = `UPDATE employees SET ${updates.join(', ')}, updated_at = NOW() 
                      WHERE email = $${i++} AND tenant_id = $${i++} RETURNING id`;

    const result = await query(queryStr, values);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
