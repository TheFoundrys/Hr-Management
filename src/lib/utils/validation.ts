import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STAFF', 'HOD', 'HR', 'ADMIN']),
  tenantId: z.string().min(1, 'Tenant ID is required'),
});

export const employeeSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  role: z.enum(['STAFF', 'HOD', 'HR', 'ADMIN']),
  department: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  tenantId: z.string().min(1),
  deviceUserId: z.string().optional().default(''),
  dateOfJoining: z.string().optional(),
  salary: z.object({
    basic: z.number().min(0),
    hra: z.number().min(0).default(0),
    allowances: z.number().min(0).default(0),
    deductions: z.number().min(0).default(0),
  }).optional(),
  address: z.string().optional().default(''),
});

export const leaveSchema = z.object({
  employeeId: z.string().min(1),
  leaveType: z.enum(['casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'other']),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export const leaveActionSchema = z.object({
  leaveId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  comments: z.string().optional().default(''),
});

export const attendanceManualSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.enum(['present', 'absent', 'late', 'half-day', 'on-leave', 'holiday']),
  notes: z.string().optional().default(''),
});
