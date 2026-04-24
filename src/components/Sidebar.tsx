'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  FileText, 
  Settings, 
  LogOut,
  ChevronLeft,
  Menu,
  GraduationCap,
  Briefcase,
  FileBadge,
  UserCheck,
  Building,
  CreditCard,
  FileSpreadsheet,
  User,
  ShieldAlert,
  Building2,
  LucideIcon
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { hasPermission, Permission } from '@/lib/auth/rbac';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  hideForCompany?: boolean;
  superAdminOnly?: boolean;
  hideForSuperAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tenants', href: '/superadmin/tenants', icon: Building2, superAdminOnly: true },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Attendance', href: '/attendance', icon: UserCheck, hideForSuperAdmin: true },
  { label: 'Leave', href: '/leave', icon: CalendarDays, hideForSuperAdmin: true },
  { label: 'Employees', href: '/employees', icon: Users, permission: 'MANAGE_EMPLOYEES', hideForSuperAdmin: true },
  { label: 'Departments', href: '/admin/departments', icon: Building, permission: 'MANAGE_SYSTEM', hideForCompany: true, hideForSuperAdmin: true },
  { label: 'Biometric', href: '/biometric', icon: FileBadge, permission: 'MANAGE_BIOMETRICS', hideForSuperAdmin: true },
  { label: 'Salary Structure', href: '/salary-structure', icon: CreditCard, permission: 'MANAGE_SYSTEM', hideForSuperAdmin: true },
  { label: 'Payroll', href: '/payroll', icon: FileSpreadsheet, permission: 'MANAGE_PAYROLL', hideForSuperAdmin: true },
  { label: 'Payslips', href: '/payslips', icon: FileText, hideForSuperAdmin: true },
  { label: 'Reports', href: '/reports', icon: FileText, permission: 'VIEW_REPORTS', hideForSuperAdmin: true },
  { label: 'Profile', href: '/profile', icon: User },
  // Settings removed as requested
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isSuperAdmin = ['SUPER_ADMIN', 'global_admin'].includes(user?.role || '');

  const filteredNav = NAV_ITEMS.filter(item => {
    if (isSuperAdmin) {
      if (item.hideForSuperAdmin) return false;
      return true;
    }
    if (item.superAdminOnly) return false;
    if (item.permission && !hasPermission(user?.role || '', item.permission)) return false;
    if (item.hideForCompany && user?.tenantType === 'COMPANY') return false;
    return true;
  });

  return (
    <>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-sm"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      <aside
        className={`fixed top-0 left-0 h-full bg-card border-r border-border z-40 transition-all duration-300 flex flex-col
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-64'}
        `}
      >
        <div className="flex items-center gap-3 px-5 py-6 border-b border-border">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            {isSuperAdmin ? <ShieldAlert className="w-5 h-5 text-primary" /> : <GraduationCap className="w-5 h-5 text-primary" />}
          </div>
          {!collapsed && (
            <span className="font-bold text-sm text-foreground tracking-tight truncate uppercase">
              {isSuperAdmin ? 'Management' : (user?.tenantName || 'HR Portal')}
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 group
                  ${isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                `}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-[11px] font-bold uppercase tracking-tight">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border bg-muted/30 space-y-3">
          {!collapsed && (
            <div className="px-2">
              <p className="text-[11px] font-black text-foreground truncate">{user?.name}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{user?.role}</p>
            </div>
          )}
          
          <div className="flex flex-col gap-1">
            <ThemeToggle collapsed={collapsed} />
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="text-[11px] font-bold uppercase">Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
