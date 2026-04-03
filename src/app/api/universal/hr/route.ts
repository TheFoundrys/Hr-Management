import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { globalTenantManager } from '@/lib/multiTenant';
import crypto from 'crypto';

// Universal HR modules that work across all tenants
export async function POST(request: Request) {
  try {
    const { tenantId, module, action, data } = await request.json();

    if (!tenantId || !module || !action) {
      return NextResponse.json({
        error: 'Tenant ID, module, and action are required'
      }, { status: 400 });
    }

    // Get tenant info
    const tenant = await globalTenantManager.initializeTenant(request);

    switch (module) {
      case 'faculty':
        return await handleFaculty(tenant.id, action, data);
      case 'interns':
        return await handleInterns(tenant.id, action, data);
      case 'attendance':
        return await handleAttendance(tenant.id, action, data);
      case 'leave':
        return await handleLeave(tenant.id, action, data);
      case 'documents':
        return await handleDocuments(tenant.id, action, data);
      case 'dashboard':
        return await handleDashboard(tenant.id, action, data);
      default:
        return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
    }

  } catch (error) {
    console.error('Universal HR error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process HR request'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const module = searchParams.get('module');

    if (!tenantId || !module) {
      return NextResponse.json({
        error: 'Tenant ID and module are required'
      }, { status: 400 });
    }

    const tenant = await globalTenantManager.initializeTenant(request);

    switch (module) {
      case 'faculty':
        return await getFaculty(tenant.id);
      case 'interns':
        return await getInterns(tenant.id);
      case 'attendance':
        return await getAttendance(tenant.id, searchParams);
      case 'leave':
        return await getLeave(tenant.id);
      case 'documents':
        return await getDocuments(tenant.id);
      case 'dashboard':
        return await getDashboard(tenant.id);
      default:
        return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
    }

  } catch (error) {
    console.error('Universal HR GET error:', error);
    return NextResponse.json({
      error: 'Failed to get HR data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 👨‍🏫 Faculty / Staff Management
async function handleFaculty(tenantId: string, action: string, data: any) {
  switch (action) {
    case 'add':
      // 1. Ensure User exists
      let userQuery = await query('SELECT id FROM users WHERE email = $1', [data.email]);
      let userId;

      if (userQuery.rows.length === 0) {
        const uRes = await query(
          `INSERT INTO users (tenant_id, email, password_hash, name, role)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [tenantId, data.email, '$2b$12$5eRfxaFdxxCbGadb37vdRuoOA6m3p3oZuja6gqelmqXZL4SC1u0me', data.firstName + ' ' + data.lastName, 'STAFF']
        );
        userId = uRes.rows[0].id;
      } else {
        userId = userQuery.rows[0].id;
      }

      // 2. Handle Department (Normalization)
      let deptId = null;
      if (data.department) {
        const dRes = await query('SELECT id FROM departments WHERE tenant_id = $1 AND name = $2', [tenantId, data.department]);
        if (dRes.rows.length > 0) deptId = dRes.rows[0].id;
        else {
          const newDept = await query('INSERT INTO departments (tenant_id, name) VALUES ($1, $2) RETURNING id', [tenantId, data.department]);
          deptId = newDept.rows[0].id;
        }
      }

      // 3. Handle Designation (Normalization)
      let desigId = null;
      if (data.designation) {
        const dsRes = await query('SELECT id FROM designations WHERE tenant_id = $1 AND name = $2', [tenantId, data.designation]);
        if (dsRes.rows.length > 0) desigId = dsRes.rows[0].id;
        else {
          const newDesig = await query('INSERT INTO designations (tenant_id, name) VALUES ($1, $2) RETURNING id', [tenantId, data.designation]);
          desigId = newDesig.rows[0].id;
        }
      }

      const result = await query(
        `INSERT INTO employees
         (tenant_id, user_id, university_id, first_name, last_name, email, department_id, designation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [tenantId, userId, data.universityId, data.firstName, data.lastName, data.email, deptId, desigId]
      );
      return NextResponse.json({ success: true, faculty: result.rows[0] });

    case 'update':
      // Update normalized relations if provided
      let updDeptId = undefined;
      if (data.department) {
         const dRes = await query('INSERT INTO departments (tenant_id, name) VALUES ($1, $2) ON CONFLICT (tenant_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id', [tenantId, data.department]);
         updDeptId = dRes.rows[0].id;
      }

      await query(
        `UPDATE employees
         SET first_name = $2, last_name = $3,
             department_id = COALESCE($4, department_id), 
             updated_at = NOW()
         WHERE university_id = $1 AND tenant_id = $5`,
        [data.universityId, data.firstName, data.lastName, updDeptId, tenantId]
      );
      return NextResponse.json({ success: true, message: 'Faculty updated' });

    case 'delete':
      await query(
        `DELETE FROM employees WHERE university_id = $1 AND tenant_id = $2`,
        [data.universityId, tenantId]
      );
      return NextResponse.json({ success: true, message: 'Faculty deleted' });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getFaculty(tenantId: string) {
  const result = await query(
    `SELECT e.*, d.name as department, ds.name as designation, u.role
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations ds ON e.designation_id = ds.id
     LEFT JOIN users u ON e.user_id = u.id
     WHERE e.tenant_id = $1
     ORDER BY e.created_at DESC`,
    [tenantId]
  );

  return NextResponse.json({
    success: true,
    faculty: result.rows
  });
}

// 🧑‍🎓 Student Assistants / Interns
async function handleInterns(tenantId: string, action: string, data: any) {
  switch (action) {
    case 'add':
      const result = await query(
        `INSERT INTO interns
         (tenant_id, first_name, last_name, email, phone, university, department, start_date, end_date, supervisor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          tenantId,
          data.firstName,
          data.lastName,
          data.email,
          data.phone,
          data.university,
          data.department,
          data.startDate,
          data.endDate,
          data.supervisor
        ]
      );
      return NextResponse.json({ success: true, intern: result.rows[0] });

    case 'update':
      await query(
        `UPDATE interns
         SET first_name = $2, last_name = $3, email = $4, phone = $5,
             university = $6, department = $7, start_date = $8, end_date = $9,
             supervisor = $10, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $11`,
        [data.id, data.firstName, data.lastName, data.email, data.phone,
         data.university, data.department, data.startDate, data.endDate, data.supervisor, tenantId]
      );
      return NextResponse.json({ success: true, message: 'Intern updated' });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getInterns(tenantId: string) {
  const result = await query(
    `SELECT * FROM interns
     WHERE tenant_id = $1 AND (end_date IS NULL OR end_date > CURRENT_DATE)
     ORDER BY start_date DESC`,
    [tenantId]
  );

  return NextResponse.json({
    success: true,
    interns: result.rows
  });
}

// 🕒 Attendance Tracking
async function handleAttendance(tenantId: string, action: string, data: any) {
  switch (action) {
    case 'manual-add':
      // Lookup employee UUID from universityId
      const empRes = await query('SELECT id FROM employees WHERE university_id = $1 AND tenant_id = $2', [data.universityId, tenantId]);
      if (empRes.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      const employeeId = empRes.rows[0].id;

      const result = await query(
        `INSERT INTO attendance
         (employee_id, date, check_in, check_out, status, working_hours)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          employeeId,
          data.date,
          data.checkIn,
          data.checkOut,
          data.status.toUpperCase(),
          data.workingHours || 0
        ]
      );
      return NextResponse.json({ success: true, attendance: result.rows[0] });

    case 'bulk-update':
      for (const record of data.records) {
        await query(
          `UPDATE attendance
           SET check_out = $2, status = $3, updated_at = NOW()
           WHERE id = $1`,
          [record.id, record.checkOut, record.status.toUpperCase()]
        );
      }
      return NextResponse.json({ success: true, message: 'Bulk attendance updated' });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getAttendance(tenantId: string, searchParams: URLSearchParams) {
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const status = searchParams.get('status');

  let whereClause = `WHERE e.tenant_id = $1`;
  let queryParams = [tenantId];

  if (date) {
    whereClause += ` AND DATE(a.date) = DATE($${queryParams.length + 1})`;
    queryParams.push(date);
  }

  if (status) {
    whereClause += ` AND a.status = $${queryParams.length + 1}`;
    queryParams.push(status.toUpperCase());
  }

  const result = await query(
    `SELECT a.*, e.university_id, e.first_name, e.last_name, e.email
     FROM attendance a
     JOIN employees e ON a.employee_id = e.id
     ${whereClause}
     ORDER BY a.date DESC, a.check_in DESC`,
    queryParams
  );

  // Map to frontend expectations
  const attendance = result.rows.map(r => ({
    ...r,
    universityId: r.university_id,
    firstName: r.first_name,
    lastName: r.last_name,
    checkIn: r.check_in,
    checkOut: r.check_out,
    workingHours: r.working_hours
  }));

  return NextResponse.json({
    success: true,
    attendance,
    filters: { date, status }
  });
}

// 📝 Leave Requests & Approvals
async function handleLeave(tenantId: string, action: string, data: any) {
  switch (action) {
    case 'request':
      // Lookup employee UUID from universityId
      const empRes = await query('SELECT id FROM employees WHERE university_id = $1 AND tenant_id = $2', [data.universityId, tenantId]);
      if (empRes.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      const employeeId = empRes.rows[0].id;

      const result = await query(
        `INSERT INTO leaves
         (employee_id, leave_type, start_date, end_date, reason, status)
         VALUES ($1, $2, $3, $4, $5, 'PENDING')
         RETURNING *`,
        [
          employeeId,
          (data.type || data.leaveType || 'CASUAL').toUpperCase(),
          data.startDate,
          data.endDate,
          data.reason
        ]
      );
      return NextResponse.json({ success: true, leave: result.rows[0] });

    case 'approve':
    case 'reject':
      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      await query(
        `UPDATE leaves
         SET status = $2, updated_at = NOW()
         WHERE id = $1`,
        [data.leaveId, newStatus]
      );
      return NextResponse.json({
        success: true,
        message: `Leave ${newStatus}`
      });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getLeave(tenantId: string) {
  const result = await query(
    `SELECT l.*, e.first_name as "firstName", e.last_name as "lastName", e.email, e.university_id as "universityId"
     FROM leaves l
     JOIN employees e ON l.employee_id = e.id
     WHERE e.tenant_id = $1
     ORDER BY l.created_at DESC`,
    [tenantId]
  );

  return NextResponse.json({
    success: true,
    leave: result.rows
  });
}

// 📂 Documents Management
async function handleDocuments(tenantId: string, action: string, data: any) {
  switch (action) {
    case 'upload':
      const empRes = await query('SELECT id FROM employees WHERE university_id = $1 AND tenant_id = $2', [data.universityId, tenantId]);
      if (empRes.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      const employeeId = empRes.rows[0].id;

      const result = await query(
        `INSERT INTO documents
         (employee_id, doc_type, file_name, file_path, file_size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          employeeId,
          data.documentType || data.type,
          data.fileName || data.name,
          data.filePath || data.path,
          Number(data.fileSize || data.size)
        ]
      );
      return NextResponse.json({ success: true, document: result.rows[0] });

    case 'delete':
      await query(
        `DELETE FROM documents 
         WHERE id = $1 AND employee_id IN (SELECT id FROM employees WHERE tenant_id = $2)`,
        [data.documentId, tenantId]
      );
      return NextResponse.json({ success: true, message: 'Document deleted' });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getDocuments(tenantId: string) {
  const result = await query(
    `SELECT d.*, e.first_name as "firstName", e.last_name as "lastName", e.email, e.university_id as "universityId"
     FROM documents d
     JOIN employees e ON d.employee_id = e.id
     WHERE e.tenant_id = $1
     ORDER BY d.created_at DESC`,
    [tenantId]
  );

  return NextResponse.json({
    success: true,
    documents: result.rows
  });
}

// 📊 Simple Dashboard
async function handleDashboard(tenantId: string, action: string, data: any) {
  switch (action) {
    case 'stats':
      const stats = await getDashboardStats(tenantId);
      return NextResponse.json({ success: true, stats });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getDashboard(tenantId: string) {
  const stats = await getDashboardStats(tenantId);

  return NextResponse.json({
    success: true,
    dashboard: {
      stats,
      recentActivity: await getRecentActivity(tenantId)
    }
  });
}

async function getDashboardStats(tenantId: string) {
  const [faculty, attendance, leave, documents] = await Promise.all([
    query(`SELECT COUNT(*) as count FROM employees WHERE tenant_id = $1`, [tenantId]),
    query(`SELECT COUNT(*) as count FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE e.tenant_id = $1 AND DATE(a.date) = CURRENT_DATE`, [tenantId]),
    query(`SELECT COUNT(*) as count FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE e.tenant_id = $1 AND l.status = 'PENDING'`, [tenantId]),
    query(`SELECT COUNT(*) as count FROM documents d JOIN employees e ON d.employee_id = e.id WHERE e.tenant_id = $1`, [tenantId])
  ]);

  return {
    totalFaculty: parseInt(faculty.rows[0].count),
    todayAttendance: parseInt(attendance.rows[0].count),
    pendingLeave: parseInt(leave.rows[0].count),
    totalDocuments: parseInt(documents.rows[0].count)
  };
}

async function getRecentActivity(tenantId: string) {
  const result = await query(
    `SELECT 'Faculty Added' as activity, first_name || ' ' || last_name as details, created_at as timestamp
     FROM employees WHERE tenant_id = $1
     UNION ALL
     SELECT 'Leave Request' as activity, leave_type as details, created_at as timestamp
     FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE e.tenant_id = $1
     ORDER BY timestamp DESC LIMIT 10`,
    [tenantId]
  );

  return result.rows;
}
