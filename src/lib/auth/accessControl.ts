import { hasPermission, type Permission, type Role } from '@/lib/auth/rbac';

/** Roles that can be assigned through tenant employee management (not platform-only). */
export const TENANT_ASSIGNABLE_ROLES: Role[] = [
  'EMPLOYEE',
  'STAFF',
  'FACULTY',
  'TEACHING',
  'NON_TEACHING',
  'TEAM_LEAD',
  'MANAGER',
  'HOD',
  'HR_EXECUTIVE',
  'HR',
  'HR_MANAGER',
  'PAYROLL_ADMIN',
  'IT_ADMIN',
  'LEARNING_ADMIN',
  'PRINCIPAL',
  'DIRECTOR',
  'EXPENSE_MANAGER',
  'PENDING',
  'ADMIN',
  'GLOBAL_ADMIN',
];

const ADMIN_CLASS: Role[] = ['ADMIN', 'GLOBAL_ADMIN'];

function norm(r: string): string {
  return (r || '').toUpperCase().replace(/[-\s]/g, '_');
}

/** Same list as getAssignableRoles for non-super roles (tenant-safe ceiling). */
function tenantAssignableCeiling(): Role[] {
  return TENANT_ASSIGNABLE_ROLES.filter((r) => !ADMIN_CLASS.includes(r) && r !== 'SUPER_ADMIN');
}

/**
 * People who run the directory and leave workflow but are not full HR admins (e.g. HR_EXECUTIVE)
 * may still assign login roles — capped list, no tenant ADMIN / HR lead / payroll / principal.
 */
const LOGIN_ACCESS_ASSIGNEE_CAP: Role[] = TENANT_ASSIGNABLE_ROLES.filter(
  (r) =>
    !ADMIN_CLASS.includes(r) &&
    r !== 'SUPER_ADMIN' &&
    !['HR', 'HR_MANAGER', 'PAYROLL_ADMIN', 'PRINCIPAL', 'DIRECTOR'].includes(r)
);

/** May change another user's login (access) role from Employees or access-control APIs. */
export function canManageEmployeeLoginAccess(actorRole: string, customRoles?: Record<string, Permission[]>): boolean {
  if (hasPermission(actorRole, 'MANAGE_EMPLOYEES', customRoles) || hasPermission(actorRole, 'MANAGE_SYSTEM', customRoles)) {
    return true;
  }
  return (
    hasPermission(actorRole, 'VIEW_ALL_EMPLOYEES', customRoles) && hasPermission(actorRole, 'MANAGE_LEAVE', customRoles)
  );
}

/** Returns roles the actor may assign to another user in the same tenant. */
export function getAssignableRoles(actorRole: string, customRoles?: Record<string, Permission[]>): Role[] {
  const a = norm(actorRole) as Role;
  if (a === 'SUPER_ADMIN') {
    return [...TENANT_ASSIGNABLE_ROLES, 'SUPER_ADMIN'];
  }
  if (a === 'GLOBAL_ADMIN') {
    return TENANT_ASSIGNABLE_ROLES.filter((r) => r !== 'SUPER_ADMIN');
  }
  if (a === 'ADMIN') {
    return tenantAssignableCeiling();
  }
  if (hasPermission(actorRole, 'MANAGE_SYSTEM', customRoles)) {
    return tenantAssignableCeiling();
  }
  if (hasPermission(actorRole, 'MANAGE_EMPLOYEES', customRoles)) {
    return tenantAssignableCeiling();
  }
  if (
    hasPermission(actorRole, 'VIEW_ALL_EMPLOYEES', customRoles) &&
    hasPermission(actorRole, 'MANAGE_LEAVE', customRoles)
  ) {
    return LOGIN_ACCESS_ASSIGNEE_CAP;
  }
  return [];
}

export function canAssignRole(
  actorRole: string,
  newRole: string,
  customRoles?: Record<string, Permission[]>
): boolean {
  const list = getAssignableRoles(actorRole, customRoles);
  return list.includes(norm(newRole) as Role);
}

export function isAdminAccessRole(role: string): boolean {
  const r = norm(role);
  return r === 'ADMIN' || r === 'GLOBAL_ADMIN' || r === 'SUPER_ADMIN';
}
