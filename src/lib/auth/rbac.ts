export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'HOD' | 'STAFF' | 'FACULTY' | 'TEACHING' | 'NON_TEACHING' | 'EMPLOYEE';

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
  | 'MANAGE_ADMINS' // Exclusive Super Admin permission
  | 'VIEW_NON_TEACHING_DASHBOARD'; // Exclusive Non-Teaching permission

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'MANAGE_BIOMETRICS', 'MANAGE_NETWORK_SECURITY', 'MANAGE_SCHEDULING',
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'MANAGE_ADMINS'
  ],
  ADMIN: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'MANAGE_BIOMETRICS', 'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE'
  ],
  HR: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE'
  ],
  HOD: [
    'VIEW_ALL_EMPLOYEES', 'VIEW_OWN_PAYSLIP', 'MANAGE_PAYROLL',
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  STAFF: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  FACULTY: [
    'VIEW_OWN_PAYSLIP', 'VIEW_SCHEDULE', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  TEACHING: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  EMPLOYEE: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'
  ],
  NON_TEACHING: [
    'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'VIEW_NON_TEACHING_DASHBOARD'
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const normalizedRole = (role || '').toUpperCase() as Role;
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
  { pathPattern: /^\/api\/biometric\/users/i, permission: 'MANAGE_BIOMETRICS' }
];

export function getRequiredPermissionForPath(pathname: string): Permission | null {
  for (const mapping of ROUTE_PERMISSIONS) {
    if (mapping.pathPattern.test(pathname)) {
      return mapping.permission;
    }
  }
  return null;
}
