export type Role = 
  | 'SUPER_ADMIN' | 'GLOBAL_ADMIN' | 'ADMIN' | 'HR' | 'HR_MANAGER' | 'HR_EXECUTIVE' 
  | 'PAYROLL_ADMIN' | 'EXPENSE_MANAGER' | 'IT_ADMIN' | 'LEARNING_ADMIN' 
  | 'MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE' | 'HOD' | 'PRINCIPAL' | 'DIRECTOR'
  | 'FACULTY' | 'STAFF' | 'NON_TEACHING' | 'PENDING' | 'TEACHING';

export type Permission = 
  | 'VIEW_ALL_EMPLOYEES'
  | 'MANAGE_EMPLOYEES'
  | 'MANAGE_PAYROLL'
  | 'VIEW_OWN_PAYSLIP'
  | 'MANAGE_SCHEDULING'
  | 'VIEW_SCHEDULE'
  | 'MANAGE_BIOMETRICS'
  | 'MANAGE_NETWORK_SECURITY'
  | 'VIEW_TEAM'
  | 'MANAGE_TEAM'
  | 'VIEW_ATTENDANCE'
  | 'MANAGE_ATTENDANCE'
  | 'VIEW_LEAVE'
  | 'MANAGE_LEAVE'
  | 'MANAGE_ADMINS'
  | 'VIEW_NON_TEACHING_DASHBOARD'
  | 'MANAGE_SUPPORT_REQUESTS'
  | 'MANAGE_SYSTEM'
  | 'VIEW_REPORTS';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'MANAGE_BIOMETRICS', 'MANAGE_NETWORK_SECURITY', 'MANAGE_SCHEDULING',
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'MANAGE_ADMINS', 'MANAGE_SUPPORT_REQUESTS', 'MANAGE_SYSTEM', 'VIEW_REPORTS'
  ],
  GLOBAL_ADMIN: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'VIEW_OWN_PAYSLIP',
    'MANAGE_BIOMETRICS', 'MANAGE_NETWORK_SECURITY', 'MANAGE_SCHEDULING',
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'MANAGE_SUPPORT_REQUESTS', 'MANAGE_SYSTEM', 'VIEW_REPORTS', 'MANAGE_PAYROLL'
  ],
  ADMIN: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'MANAGE_BIOMETRICS', 'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'MANAGE_SUPPORT_REQUESTS', 'MANAGE_SYSTEM'
  ],
  HR_MANAGER: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'MANAGE_SUPPORT_REQUESTS'
  ],
  HR: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'MANAGE_SUPPORT_REQUESTS'
  ],
  HR_EXECUTIVE: [
    'VIEW_ALL_EMPLOYEES', 'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE'
  ],
  PAYROLL_ADMIN: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 'VIEW_ATTENDANCE'
  ],
  IT_ADMIN: [
    'VIEW_OWN_PAYSLIP', 'MANAGE_BIOMETRICS', 'MANAGE_NETWORK_SECURITY', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  LEARNING_ADMIN: [
    'VIEW_OWN_PAYSLIP', 'MANAGE_SCHEDULING', 'VIEW_ATTENDANCE'
  ],
  MANAGER: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE'
  ],
  TEAM_LEAD: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  HOD: [
    'VIEW_OWN_PAYSLIP',
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE'
  ],
  PRINCIPAL: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE'
  ],
  DIRECTOR: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE'
  ],
  FACULTY: [
    'VIEW_OWN_PAYSLIP', 'VIEW_SCHEDULE', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  EMPLOYEE: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  STAFF: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  NON_TEACHING: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'VIEW_NON_TEACHING_DASHBOARD'
  ],
  PENDING: [],
  EXPENSE_MANAGER: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE'
  ],
  TEACHING: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  if (!role || !permission) return false;
  const normalizedRole = role.toUpperCase().replace(/[-\s]/g, '_') as Role;
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  return permissions.includes(permission);
}

// Map specific sub-paths or exact matches to required permissions
export const ROUTE_PERMISSIONS: { pathPattern: RegExp, permission: Permission }[] = [
  { pathPattern: /^\/api\/employees\/me/i, permission: 'VIEW_OWN_PAYSLIP' },
  { pathPattern: /^\/api\/employees/i, permission: 'VIEW_ALL_EMPLOYEES' },
  { pathPattern: /^\/api\/payroll\/admin/i, permission: 'MANAGE_PAYROLL' },
  { pathPattern: /^\/api\/payroll\/history/i, permission: 'VIEW_OWN_PAYSLIP' },
  { pathPattern: /^\/api\/payroll\/generate/i, permission: 'MANAGE_PAYROLL' },
  { pathPattern: /^\/api\/admin\/scheduling/i, permission: 'MANAGE_SCHEDULING' },
  { pathPattern: /^\/admin\/scheduling/i, permission: 'MANAGE_SCHEDULING' },
  { pathPattern: /^\/faculty\/schedule/i, permission: 'VIEW_SCHEDULE' },
  { pathPattern: /^\/api\/admin\/devices/i, permission: 'MANAGE_BIOMETRICS' },
  { pathPattern: /^\/api\/admin\/attendance\/network/i, permission: 'MANAGE_NETWORK_SECURITY' },
  { pathPattern: /^\/api\/biometric\/users/i, permission: 'MANAGE_BIOMETRICS' },
  { pathPattern: /^\/api\/leave\/approve/i, permission: 'MANAGE_LEAVE' },
  { pathPattern: /^\/api\/leave\/requests/i, permission: 'VIEW_LEAVE' },
  { pathPattern: /^\/api\/attendance\/process/i, permission: 'MANAGE_ATTENDANCE' },
  { pathPattern: /^\/api\/attendance/i, permission: 'VIEW_ATTENDANCE' }
];

export function getRequiredPermissionForPath(pathname: string): Permission | null {
  for (const mapping of ROUTE_PERMISSIONS) {
    if (mapping.pathPattern.test(pathname)) {
      return mapping.permission;
    }
  }
  return null;
}
