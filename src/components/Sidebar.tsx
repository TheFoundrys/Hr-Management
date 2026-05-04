'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Menu,
  GraduationCap,
  FileBadge,
  UserCheck,
  Building,
  CreditCard,
  FileSpreadsheet,
  User,
  UserPlus,
  ShieldAlert,
  Shield,
  Building2,
  Layers,
  GitBranch,
  UserSquare2,
  Plane,
  Palette,
  Receipt,
  ClipboardList,
  Wifi,
  CalendarRange,
  MessageSquare,
  LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { hasAnyPermission, type Permission, type PermissionRequirement } from '@/lib/auth/rbac';
import type { TenantModuleKey, TenantType } from '@/lib/types/tenant';
import { ThemeToggle } from './ThemeToggle';

type NavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionRequirement;
  hideForEmployee?: boolean;
  superAdminOnly?: boolean;
  hideForSuperAdmin?: boolean;
  module?: TenantModuleKey;
  /** Prefix match; omit if `exactHref` */
  activePaths?: string[];
  /** Only highlight when pathname equals `href` (avoids /admin/scheduling matching /admin/scheduling/entities) */
  exactHref?: boolean;
  /** If set, link is shown only for these tenant types (e.g. scheduling / org structure for EDUCATION only). */
  requireTenantTypes?: TenantType[];
  /** Hidden for front-line staff roles (STAFF, FACULTY, etc.) — not HR/managers who still use the staff-style home dashboard. */
  hideForLineStaff?: boolean;
};

type NavSection = {
  id: string;
  title: string;
  /** Entire section only for super admin (e.g. platform tools) */
  superAdminOnly?: boolean;
  hideForSuperAdmin?: boolean;
  items: NavLink[];
};

const SUPER_ADMIN_NAV: NavSection[] = [
  {
    id: 'platform',
    title: 'Platform',
    superAdminOnly: true,
    items: [
      { label: 'Tenants', href: '/superadmin/tenants', icon: Building2, superAdminOnly: true },
      { label: 'Blueprints', href: '/superadmin/templates', icon: Layers, superAdminOnly: true },
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, superAdminOnly: true },
    ],
  },
];

const TENANT_NAV: NavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    hideForSuperAdmin: true,
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, hideForSuperAdmin: true }],
  },
  {
    id: 'time',
    title: 'Time',
    hideForSuperAdmin: true,
    items: [
      { label: 'Attendance', href: '/attendance', icon: UserCheck, hideForSuperAdmin: true, module: 'attendance' },
      { label: 'Leave', href: '/leave', icon: CalendarDays, hideForSuperAdmin: true, module: 'leave' },
      {
        label: 'Leave administration',
        href: '/admin/leave',
        icon: ClipboardList,
        permission: 'MANAGE_LEAVE',
        hideForSuperAdmin: true,
        module: 'leave',
        activePaths: ['/admin/leave'],
      },
    ],
  },
  {
    id: 'people',
    title: 'People',
    hideForSuperAdmin: true,
    items: [
      { label: 'Team', href: '/team', icon: UserSquare2, permission: 'VIEW_TEAM', hideForSuperAdmin: true },
      {
        label: 'Org chart',
        href: '/team/tree',
        icon: GitBranch,
        permission: ['VIEW_TEAM', 'VIEW_ALL_EMPLOYEES'],
        hideForSuperAdmin: true,
        activePaths: ['/team/tree'],
      },
      {
        label: 'Employees',
        href: '/employees',
        icon: Users,
        permission: ['VIEW_ALL_EMPLOYEES', 'VIEW_TEAM', 'VIEW_ATTENDANCE', 'VIEW_LEAVE'],
        hideForSuperAdmin: true,
        hideForLineStaff: true,
      },
      {
        label: 'Documents',
        href: '/documents',
        icon: FileText,
        hideForSuperAdmin: true,
        activePaths: ['/documents'],
        hideForLineStaff: true,
      },
      {
        label: 'Hire',
        href: '/hire',
        icon: UserPlus,
        permission: 'MANAGE_EMPLOYEES',
        hideForSuperAdmin: true,
        module: 'recruitment',
      },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll',
    hideForSuperAdmin: true,
    items: [
      {
        label: 'Salary & structure',
        href: '/salary-structure',
        icon: CreditCard,
        permission: 'MANAGE_PAYROLL',
        hideForSuperAdmin: true,
        activePaths: ['/salary-structure', '/payroll'],
        module: 'payroll',
      },
      {
        label: 'Payslips',
        href: '/payslips',
        icon: Receipt,
        permission: 'VIEW_OWN_PAYSLIP',
        hideForSuperAdmin: true,
        activePaths: ['/payslips'],
        module: 'payroll',
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: FileSpreadsheet,
        permission: 'VIEW_REPORTS',
        hideForSuperAdmin: true,
        activePaths: ['/reports'],
        module: 'payroll',
      },
    ],
  },
  {
    id: 'company',
    title: 'Company',
    hideForSuperAdmin: true,
    items: [
      {
        label: 'Organization',
        href: '/admin/scheduling/entities',
        icon: Building,
        permission: 'MANAGE_SYSTEM',
        hideForSuperAdmin: true,
        activePaths: ['/admin/scheduling/entities'],
        requireTenantTypes: ['EDUCATION'],
      },
      {
        label: 'Scheduling',
        href: '/admin/scheduling',
        icon: CalendarRange,
        permission: ['MANAGE_SCHEDULING', 'MANAGE_SYSTEM'],
        hideForSuperAdmin: true,
        exactHref: true,
        requireTenantTypes: ['EDUCATION'],
      },
      { label: 'Holidays', href: '/admin/holidays', icon: Plane, permission: 'MANAGE_SYSTEM', hideForSuperAdmin: true },
      {
        label: 'Support',
        href: '/admin/requests',
        icon: MessageSquare,
        permission: 'MANAGE_SUPPORT_REQUESTS',
        hideForSuperAdmin: true,
        activePaths: ['/admin/requests'],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & security',
    hideForSuperAdmin: true,
    items: [
      {
        label: 'Access control',
        href: '/admin/access-control',
        icon: Shield,
        permission: ['MANAGE_EMPLOYEES', 'MANAGE_SYSTEM'],
        hideForSuperAdmin: true,
      },
      {
        label: 'Network attendance',
        href: '/admin/attendance/network',
        icon: Wifi,
        permission: 'MANAGE_NETWORK_SECURITY',
        hideForSuperAdmin: true,
        activePaths: ['/admin/attendance/network'],
      },
      { label: 'Biometric', href: '/biometric', icon: FileBadge, permission: 'MANAGE_BIOMETRICS', hideForSuperAdmin: true },
    ],
  },
  {
    id: 'personal',
    title: 'My profile',
    hideForSuperAdmin: true,
    items: [
      { label: 'Profile', href: '/profile', icon: User, hideForSuperAdmin: true },
      { label: 'Appearance', href: '/settings/appearance', icon: Palette, hideForSuperAdmin: true, activePaths: ['/settings'] },
    ],
  },
];

/** Roles that use the staff home dashboard and should not see directory / company-doc nav. */
const LINE_STAFF_ROLES = new Set([
  'STAFF',
  'FACULTY',
  'EMPLOYEE',
  'TEACHING',
  'NON_TEACHING',
  'PENDING',
]);

function isLineStaffRole(role: string): boolean {
  const r = (role || '').toUpperCase().replace(/-/g, '_');
  return LINE_STAFF_ROLES.has(r);
}

function linkVisible(
  item: NavLink,
  ctx: {
    isSuperAdmin: boolean;
    role: string;
    isEmployee: boolean;
    tenantType: TenantType;
    modules?: Record<string, boolean | undefined>;
    customRoles?: Record<string, Permission[]>;
  }
): boolean {
  if (ctx.isSuperAdmin) return !!item.superAdminOnly;
  if (item.superAdminOnly) return false;
  if (item.hideForSuperAdmin && ctx.isSuperAdmin) return false;
  if (item.hideForEmployee && ctx.isEmployee) return false;
  if (item.hideForLineStaff && isLineStaffRole(ctx.role)) return false;
  if (item.requireTenantTypes?.length && !item.requireTenantTypes.includes(ctx.tenantType)) return false;
  if (item.permission && !hasAnyPermission(ctx.role, item.permission, ctx.customRoles)) return false;
  if (item.module && ctx.modules && ctx.modules[item.module] === false) return false;
  return true;
}

function filterSections(
  sections: NavSection[],
  ctx: Parameters<typeof linkVisible>[1]
): { section: NavSection; items: NavLink[] }[] {
  return sections
    .map((section) => {
      if (ctx.isSuperAdmin) {
        if (!section.superAdminOnly) return null;
      } else if (section.superAdminOnly) {
        return null;
      }
      if (section.hideForSuperAdmin && ctx.isSuperAdmin) return null;
      const items = section.items.filter((item) => linkVisible(item, ctx));
      if (items.length === 0) return null;
      return { section, items };
    })
    .filter(Boolean) as { section: NavSection; items: NavLink[] }[];
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPER_ADMIN';
  const isEducation = user?.tenantType === 'EDUCATION';
  const isEmployee = (user?.role || '').toUpperCase() === 'EMPLOYEE';

  const vocabulary = user?.tenantSettings?.hierarchy?.label_vocabulary || (isEducation ? 'university' : 'corporate');
  const customLabels = user?.tenantSettings?.hierarchy?.custom_labels || {};

  const getLabel = (defaultLabel: string) => {
    if (defaultLabel === 'Employees') return customLabels.employee || (vocabulary === 'university' ? 'Faculty & Staff' : 'Employees');
    if (defaultLabel === 'Organization') return customLabels.department || (vocabulary === 'university' ? 'Faculties' : 'Departments');
    return defaultLabel;
  };

  const ctx = useMemo(
    () => ({
      isSuperAdmin,
      role: user?.role || '',
      isEmployee,
      tenantType: (user?.tenantType || 'COMPANY') as TenantType,
      modules: user?.tenantSettings?.modules as Record<string, boolean | undefined> | undefined,
      customRoles: user?.tenantSettings?.roles,
    }),
    [isSuperAdmin, user?.role, isEmployee, user?.tenantType, user?.tenantSettings?.modules, user?.tenantSettings?.roles]
  );

  const visibleBlocks = useMemo(() => {
    const raw = isSuperAdmin ? SUPER_ADMIN_NAV : TENANT_NAV;
    return filterSections(raw, ctx);
  }, [isSuperAdmin, ctx]);

  const flatLinks = useMemo(() => visibleBlocks.flatMap((b) => b.items), [visibleBlocks]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const { section, items } of visibleBlocks) {
        const activeHere = items.some((item) => {
          if (item.exactHref) return pathname === item.href || pathname === `${item.href}/`;
          return pathname === item.href || item.activePaths?.some((p) => pathname === p || pathname.startsWith(`${p}/`));
        });
        if (activeHere) next[section.id] = true;
      }
      return next;
    });
  }, [pathname, visibleBlocks]);

  const toggleSection = (id: string) => {
    setOpenSections((s) => {
      const cur = s[id] ?? true;
      return { ...s, [id]: !cur };
    });
  };

  const BrandIcon = isSuperAdmin ? ShieldAlert : isEducation ? GraduationCap : Building2;
  const logoUrl = user?.tenantSettings?.branding?.logo_url;

  const renderNavLink = (item: NavLink, opts: { nested?: boolean } = {}) => {
    const isActive = item.exactHref
      ? pathname === item.href || pathname === `${item.href}/`
      : pathname === item.href || item.activePaths?.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const displayLabel = getLabel(item.label);
    return (
      <Link
        key={`${item.href}-${item.label}`}
        href={item.href}
        className={[
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-out group motion-safe:hover:translate-x-0.5 active:scale-[0.98]',
          opts.nested ? 'pl-2 ml-2 border-l border-border/80' : '',
          isActive
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/80 ring-1 ring-transparent hover:ring-border/50',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <item.icon className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
        {(!collapsed || isMobileOpen) && (
          <span className="text-[11px] font-bold uppercase tracking-tight truncate">{displayLabel}</span>
        )}
        {collapsed && !isMobileOpen && (
          <div className="fixed left-20 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-black uppercase tracking-widest invisible group-hover:visible whitespace-nowrap z-[100] shadow-xl border border-border">
            {displayLabel}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center px-4">
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 bg-muted border border-border rounded-xl">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="ml-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <BrandIcon className="w-4 h-4 text-primary" />}
          </div>
          <span className="font-bold text-xs uppercase tracking-tight">{user?.tenantName || 'HR Portal'}</span>
        </div>
      </div>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside
        className={[
          'fixed top-0 left-0 h-full bg-card border-r border-border z-50 transition-all duration-300 flex flex-col',
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'lg:w-20' : 'lg:w-64',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 px-5 py-6 border-b border-border h-16 lg:h-auto">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <BrandIcon className="w-5 h-5 text-primary" />}
          </div>
          {(!collapsed || isMobileOpen) && (
            <span className="font-bold text-sm text-foreground tracking-tight truncate uppercase">
              {isSuperAdmin ? 'Management' : user?.tenantName || 'HR Portal'}
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block ml-auto text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden ml-auto text-muted-foreground hover:text-foreground" type="button" aria-label="Close menu">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 overflow-y-auto custom-scrollbar space-y-1">
          {collapsed && !isMobileOpen ? (
            <div className="space-y-1">
              {flatLinks.map((item) => renderNavLink(item))}
            </div>
          ) : (
            visibleBlocks.map(({ section, items }) => {
              if (items.length === 1 && !section.superAdminOnly) {
                return (
                  <div key={section.id} className="mb-1">
                    {renderNavLink(items[0])}
                  </div>
                );
              }
              const isOpen = isMobileOpen || (openSections[section.id] ?? true);
              return (
                <div key={section.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-all duration-200"
                  >
                    <span className="truncate text-left">{section.title}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform opacity-70 ${isOpen ? '' : '-rotate-90'}`}
                      aria-hidden
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 space-y-0.5">
                      {items.map((item) => renderNavLink(item, { nested: true }))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        <div className="p-4 border-t border-border bg-muted/30 space-y-3">
          {(!collapsed || isMobileOpen) && (
            <div className="px-2">
              <p className="text-[11px] font-black text-foreground truncate">{user?.name}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{user?.role}</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <ThemeToggle collapsed={collapsed && !isMobileOpen} />
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-3 lg:py-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
            >
              <LogOut className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
              {(!collapsed || isMobileOpen) && <span className="text-[11px] font-bold uppercase">Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
