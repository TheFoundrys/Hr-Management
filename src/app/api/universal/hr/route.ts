import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { tenantManager } from '@/lib/multiTenant';

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
    const tenant = await tenantManager.initializeTenant(request);

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

    const tenant = await tenantManager.initializeTenant(request);

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
      error: 'Failed to get HR data'
    }, { status: 500 });
  }
}

// 👨‍🏫 Faculty / Staff Management
async function handleFaculty(tenantId: string, action: string, data: any) {
  switch (action) {
    case 'add':
      const result = await query(
        `INSERT INTO "Employee"
         (id, "universityId", "userId", "firstName", "lastName", "email", "phone", designation, department, "joinDate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          `emp-${Date.now()}`,
          data.universityId,
          data.userId,
          data.firstName,
          data.lastName,
          data.email,
          data.phone,
          data.designation,
          data.department,
          new Date(),
          new Date(),
          new Date()
        ]
      );
      return NextResponse.json({ success: true, faculty: result.rows[0] });

    case 'update':
      await query(
        `UPDATE "Employee"
         SET "firstName" = $2, "lastName" = $3, "email" = $4, "phone" = $5,
             designation = $6, department = $7, "updatedAt" = $8
         WHERE "universityId" = $1`,
        [data.universityId, data.firstName, data.lastName, data.email, data.phone,
         data.designation, data.department, new Date()]
      );
      return NextResponse.json({ success: true, message: 'Faculty updated' });

    case 'delete':
      await query(
        `DELETE FROM "Employee" WHERE "universityId" = $1`,
        [data.universityId]
      );
      return NextResponse.json({ success: true, message: 'Faculty deleted' });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getFaculty(tenantId: string) {
  const result = await query(
    `SELECT e.*, u."universityId", u.email as userEmail, u.role
     FROM "Employee" e
     JOIN "User" u ON e."userId" = u.id
     WHERE u."tenantId" = $1
     ORDER BY e."createdAt" DESC`,
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
        `INSERT INTO "Intern"
         (id, "tenantId", "firstName", "lastName", "email", "phone",
          "university", "department", "startDate", "endDate", "supervisor", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          `intern-${Date.now()}`,
          tenantId,
          data.firstName,
          data.lastName,
          data.email,
          data.phone,
          data.university,
          data.department,
          data.startDate,
          data.endDate,
          data.supervisor,
          new Date(),
          new Date()
        ]
      );
      return NextResponse.json({ success: true, intern: result.rows[0] });

    case 'update':
      await query(
        `UPDATE "Intern"
         SET "firstName" = $2, "lastName" = $3, "email" = $4, "phone" = $5,
             "university" = $6, "department" = $7, "startDate" = $8, "endDate" = $9,
             "supervisor" = $10, "updatedAt" = $11
         WHERE id = $1`,
        [data.id, data.firstName, data.lastName, data.email, data.phone,
         data.university, data.department, data.startDate, data.endDate, data.supervisor, new Date()]
      );
      return NextResponse.json({ success: true, message: 'Intern updated' });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getInterns(tenantId: string) {
  const result = await query(
    `SELECT * FROM "Intern"
     WHERE "tenantId" = $1 AND ("endDate" IS NULL OR "endDate" > CURRENT_DATE)
     ORDER BY "startDate" DESC`,
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
      const result = await query(
        `INSERT INTO "Attendance"
         (id, "universityId", "deviceId", "checkIn", "checkOut", status, "date")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          `manual-${Date.now()}`,
          data.universityId,
          data.deviceId || 'Manual',
          data.checkIn,
          data.checkOut,
          data.status,
          data.date
        ]
      );
      return NextResponse.json({ success: true, attendance: result.rows[0] });

    case 'bulk-update':
      // Update multiple attendance records
      for (const record of data.records) {
        await query(
          `UPDATE "Attendance"
           SET "checkOut" = $2, status = $3
           WHERE id = $1`,
          [record.id, record.checkOut, record.status]
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

  let whereClause = `WHERE a."universityId" IN (SELECT "universityId" FROM "User" WHERE "tenantId" = $1)`;
  let queryParams = [tenantId];

  if (date) {
    whereClause += ` AND DATE(a.date) = DATE($${queryParams.length + 1})`;
    queryParams.push(date);
  }

  if (status) {
    whereClause += ` AND a.status = $${queryParams.length + 1}`;
    queryParams.push(status);
  }

  const result = await query(
    `SELECT a.*, e."firstName", e."lastName", u.email
     FROM "Attendance" a
     JOIN "Employee" e ON a."universityId" = e."universityId"
     JOIN "User" u ON e."userId" = u.id
     ${whereClause}
     ORDER BY a.date DESC, a."checkIn" DESC`,
    queryParams
  );

  return NextResponse.json({
    success: true,
    attendance: result.rows,
    filters: { date, status }
  });
}

// 📝 Leave Requests & Approvals
async function handleLeave(tenantId: string, action: string, data: any) {
  switch (action) {
    case 'request':
      const result = await query(
        `INSERT INTO "Leave"
         (id, "tenantId", "universityId", "leaveType", "startDate", "endDate",
          "reason", "status", "approver", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          `leave-${Date.now()}`,
          tenantId,
          data.universityId,
          data.leaveType,
          data.startDate,
          data.endDate,
          data.reason,
          'pending',
          null,
          new Date(),
          new Date()
        ]
      );
      return NextResponse.json({ success: true, leave: result.rows[0] });

    case 'approve':
    case 'reject':
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await query(
        `UPDATE "Leave"
         SET "status" = $2, "approver" = $3, "updatedAt" = $4
         WHERE id = $1`,
        [data.leaveId, newStatus, data.approver, new Date()]
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
    `SELECT l.*, e."firstName", e."lastName", u.email
     FROM "Leave" l
     JOIN "Employee" e ON l."universityId" = e."universityId"
     JOIN "User" u ON e."userId" = u.id
     WHERE l."tenantId" = $1
     ORDER BY l."createdAt" DESC`,
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
      const result = await query(
        `INSERT INTO "Document"
         (id, "tenantId", "universityId", "documentType", "fileName",
          "filePath", "fileSize", "uploadedBy", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          `doc-${Date.now()}`,
          tenantId,
          data.universityId,
          data.documentType,
          data.fileName,
          data.filePath,
          data.fileSize,
          data.uploadedBy,
          new Date(),
          new Date()
        ]
      );
      return NextResponse.json({ success: true, document: result.rows[0] });

    case 'delete':
      await query(
        `DELETE FROM "Document" WHERE id = $1 AND "tenantId" = $2`,
        [data.documentId, tenantId]
      );
      return NextResponse.json({ success: true, message: 'Document deleted' });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function getDocuments(tenantId: string) {
  const result = await query(
    `SELECT d.*, e."firstName", e."lastName", u.email
     FROM "Document" d
     JOIN "Employee" e ON d."universityId" = e."universityId"
     JOIN "User" u ON e."userId" = u.id
     WHERE d."tenantId" = $1
     ORDER BY d."createdAt" DESC`,
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
    query(`SELECT COUNT(*) as count FROM "Employee" e JOIN "User" u ON e."userId" = u.id WHERE u."tenantId" = $1`, [tenantId]),
    query(`SELECT COUNT(*) as count FROM "Attendance" a JOIN "User" u ON a."universityId" = u."universityId" WHERE u."tenantId" = $1 AND DATE(a.date) = CURRENT_DATE`, [tenantId]),
    query(`SELECT COUNT(*) as count FROM "Leave" l WHERE l."tenantId" = $1 AND "status" = 'pending'`, [tenantId]),
    query(`SELECT COUNT(*) as count FROM "Document" d WHERE d."tenantId" = $1`, [tenantId])
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
    `SELECT 'Faculty Added' as activity, e."firstName" || ' ' || e."lastName" as details, e."createdAt" as timestamp
     FROM "Employee" e JOIN "User" u ON e."userId" = u.id WHERE u."tenantId" = $1
     UNION ALL
     SELECT 'Leave Request' as activity, l."leaveType" as details, l."createdAt" as timestamp
     FROM "Leave" l WHERE l."tenantId" = $1
     ORDER BY timestamp DESC LIMIT 10`,
    [tenantId]
  );

  return result.rows;
}
