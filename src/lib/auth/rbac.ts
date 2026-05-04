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
    'MANAGE_SUPPORT_REQUESTS', 'MANAGE_SYSTEM', 'VIEW_REPORTS'
  ],
  HR_MANAGER: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'MANAGE_SUPPORT_REQUESTS', 'VIEW_REPORTS'
  ],
  HR: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'MANAGE_SUPPORT_REQUESTS', 'VIEW_REPORTS'
  ],
  HR_EXECUTIVE: [
    'VIEW_ALL_EMPLOYEES', 'VIEW_OWN_PAYSLIP', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE'
  ],
  PAYROLL_ADMIN: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 'VIEW_ATTENDANCE', 'VIEW_REPORTS'
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
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'VIEW_REPORTS'
  ],
  DIRECTOR: [
    'VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_PAYROLL', 'VIEW_OWN_PAYSLIP', 
    'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_LEAVE', 'MANAGE_LEAVE',
    'VIEW_REPORTS'
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

export type PermissionRequirement = Permission | Permission[];

export function hasPermission(role: string, permission: Permission, customPermissions?: Record<string, Permission[]>): boolean {
  if (!role || !permission) return false;
  const normalizedRole = role.toUpperCase().replace(/[-\s]/g, '_') as Role;
  
  // Tenant role definitions are overrides: if a tenant defines a role, use it as the source of truth.
  if (customPermissions && customPermissions[normalizedRole]) {
    return customPermissions[normalizedRole].includes(permission);
  }

  // Fallback to platform-standard permissions when the tenant has no custom role definition.
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(
  role: string,
  requirement: PermissionRequirement,
  customPermissions?: Record<string, Permission[]>
): boolean {
  const required = Array.isArray(requirement) ? requirement : [requirement];
  return required.some((permission) => hasPermission(role, permission, customPermissions));
}

// Map specific sub-paths or exact matches to required permissions
export const ROUTE_PERMISSIONS: { pathPattern: RegExp, permission: PermissionRequirement }[] = [
  { pathPattern: /^\/api\/employees\/me/i, permission: 'VIEW_OWN_PAYSLIP' },
  {
    pathPattern: /^\/api\/employees\/[^/]+\/access-role$/i,
    permission: ['MANAGE_EMPLOYEES', 'MANAGE_SYSTEM'],
  },
  { pathPattern: /^\/api\/employees/i, permission: ['VIEW_ALL_EMPLOYEES', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'] },
  { pathPattern: /^\/api\/payroll\/admin/i, permission: 'MANAGE_PAYROLL' },
  { pathPattern: /^\/api\/payroll\/history/i, permission: 'VIEW_OWN_PAYSLIP' },
  { pathPattern: /^\/api\/payroll\/generate/i, permission: 'MANAGE_PAYROLL' },
  { pathPattern: /^\/api\/payroll$/i, permission: 'MANAGE_PAYROLL' },
  { pathPattern: /^\/api\/salary-structure/i, permission: 'MANAGE_PAYROLL' },
  { pathPattern: /^\/api\/reports/i, permission: 'VIEW_REPORTS' },
  { pathPattern: /^\/api\/admin\/designations/i, permission: ['VIEW_ALL_EMPLOYEES', 'MANAGE_EMPLOYEES', 'MANAGE_SYSTEM'] },
  { pathPattern: /^\/api\/admin\/users/i, permission: 'MANAGE_EMPLOYEES' },
  { pathPattern: /^\/api\/admin\/scheduling/i, permission: ['MANAGE_SCHEDULING', 'MANAGE_SYSTEM'] },
  { pathPattern: /^\/admin\/access-control/i, permission: ['MANAGE_EMPLOYEES', 'MANAGE_SYSTEM'] },
  { pathPattern: /^\/admin\/attendance\/network/i, permission: 'MANAGE_NETWORK_SECURITY' },
  { pathPattern: /^\/admin\/holidays/i, permission: 'MANAGE_SYSTEM' },
  { pathPattern: /^\/admin\/requests/i, permission: 'MANAGE_SUPPORT_REQUESTS' },
  { pathPattern: /^\/admin\/leave/i, permission: 'MANAGE_LEAVE' },
  { pathPattern: /^\/admin\/scheduling/i, permission: ['MANAGE_SCHEDULING', 'MANAGE_SYSTEM'] },
  { pathPattern: /^\/faculty\/schedule/i, permission: 'VIEW_SCHEDULE' },
  { pathPattern: /^\/api\/admin\/devices/i, permission: 'MANAGE_BIOMETRICS' },
  { pathPattern: /^\/api\/admin\/attendance\/network/i, permission: 'MANAGE_NETWORK_SECURITY' },
  { pathPattern: /^\/api\/biometric\/users/i, permission: 'MANAGE_BIOMETRICS' },
  { pathPattern: /^\/api\/leave\/approve/i, permission: 'MANAGE_LEAVE' },
  { pathPattern: /^\/api\/wfh\/approve/i, permission: 'MANAGE_LEAVE' },
  { pathPattern: /^\/api\/leave\/requests/i, permission: 'VIEW_LEAVE' },
  { pathPattern: /^\/api\/wfh\/requests/i, permission: 'VIEW_LEAVE' },
  { pathPattern: /^\/api\/attendance\/process/i, permission: 'MANAGE_ATTENDANCE' },
  { pathPattern: /^\/api\/attendance\/events/i, permission: 'VIEW_ATTENDANCE' },
  { pathPattern: /^\/api\/attendance/i, permission: 'VIEW_ATTENDANCE' },
  { pathPattern: /^\/attendance/i, permission: 'VIEW_ATTENDANCE' },
  { pathPattern: /^\/leave/i, permission: 'VIEW_LEAVE' },
  { pathPattern: /^\/api\/team\/tree/i, permission: ['VIEW_TEAM', 'VIEW_ALL_EMPLOYEES'] },
  { pathPattern: /^\/api\/admin\/access-control\/users\/[^/]+$/i, permission: ['MANAGE_EMPLOYEES', 'MANAGE_SYSTEM'] },
  { pathPattern: /^\/team\/tree/i, permission: ['VIEW_TEAM', 'VIEW_ALL_EMPLOYEES'] },
  { pathPattern: /^\/team/i, permission: 'VIEW_TEAM' },
  { pathPattern: /^\/employees/i, permission: ['VIEW_ALL_EMPLOYEES', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'] },
  { pathPattern: /^\/hire/i, permission: 'MANAGE_EMPLOYEES' },
  { pathPattern: /^\/payroll/i, permission: 'MANAGE_PAYROLL' },
  { pathPattern: /^\/salary-structure/i, permission: 'MANAGE_PAYROLL' },
  { pathPattern: /^\/payslips/i, permission: 'VIEW_OWN_PAYSLIP' },
  { pathPattern: /^\/reports/i, permission: 'VIEW_REPORTS' },
  { pathPattern: /^\/biometric/i, permission: 'MANAGE_BIOMETRICS' },
];

export function getRequiredPermissionForPath(pathname: string): PermissionRequirement | null {
  for (const mapping of ROUTE_PERMISSIONS) {
    if (mapping.pathPattern.test(pathname)) {
      return mapping.permission;
    }
  }
  return null;
}
