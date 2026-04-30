'use client';

import { useState, useEffect } from 'react';
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
  Mail,
  FileBadge,
  UserCheck,
  Building,
  CreditCard,
  FileSpreadsheet,
  User,
  UserPlus,
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
  hideForEmployee?: boolean;
  superAdminOnly?: boolean;
  hideForSuperAdmin?: boolean;
  activePaths?: string[];
}

const FINANCE_ITEMS: NavItem[] = [
  { label: 'Salary', href: '/salary-structure', icon: CreditCard, permission: 'MANAGE_SYSTEM', hideForSuperAdmin: true },
  { label: 'Payroll', href: '/payroll', icon: FileSpreadsheet, permission: 'MANAGE_PAYROLL', hideForSuperAdmin: true },
  { label: 'Payslips', href: '/payslips', icon: FileText, hideForSuperAdmin: true },
  { label: 'Reports', href: '/reports', icon: FileText, permission: 'VIEW_REPORTS', hideForSuperAdmin: true },
];

const NAV_ITEMS: NavItem[] = [
  { label: 'Tenants', href: '/superadmin/tenants', icon: Building2, superAdminOnly: true },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: Mail, hideForEmployee: true },
  { label: 'Attendance', href: '/attendance', icon: UserCheck, hideForSuperAdmin: true },
  { label: 'Leave', href: '/leave', icon: CalendarDays, hideForSuperAdmin: true },
  { label: 'Employees', href: '/employees', icon: Users, permission: 'MANAGE_EMPLOYEES', hideForSuperAdmin: true },
  { label: 'Hire', href: '/hire', icon: UserPlus, permission: 'MANAGE_EMPLOYEES', hideForSuperAdmin: true },
  { label: 'Departments', href: '/admin/departments', icon: Building, permission: 'MANAGE_SYSTEM', hideForCompany: true, hideForSuperAdmin: true },
  { label: 'Holidays', href: '/admin/holidays', icon: CalendarDays, permission: 'MANAGE_SYSTEM', hideForSuperAdmin: true },
  { label: 'Biometric', href: '/biometric', icon: FileBadge, permission: 'MANAGE_BIOMETRICS', hideForSuperAdmin: true },
  { label: 'Finances', href: '/salary-structure', icon: CreditCard, permission: 'MANAGE_PAYROLL', activePaths: ['/salary-structure', '/payroll', '/payslips', '/reports'] },
  { label: 'Profile', href: '/profile', icon: User },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isSuperAdmin = ['SUPER_ADMIN', 'global_admin'].includes(user?.role || '');

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const filteredNav = NAV_ITEMS.filter(item => {
    if (isSuperAdmin) {
      if (item.hideForSuperAdmin) return false;
      return true;
    }
    if (item.superAdminOnly) return false;
    if (item.hideForEmployee && user?.role === 'EMPLOYEE') return false;
    if (item.permission && !hasPermission(user?.role || '', item.permission)) return false;
    if (item.hideForCompany && user?.tenantType === 'COMPANY') return false;
    return true;
  });

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center px-4">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-muted border border-border rounded-none"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="ml-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-none flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-xs uppercase tracking-tight">{user?.tenantName || 'HR Portal'}</span>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-card border-r border-border z-50 transition-all duration-300 flex flex-col
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className="flex items-center gap-3 px-5 py-6 border-b border-border h-16 lg:h-auto">
          <div className="w-10 h-10 bg-primary/10 rounded-none flex items-center justify-center shrink-0">
            {isSuperAdmin ? <ShieldAlert className="w-5 h-5 text-primary" /> : <GraduationCap className="w-5 h-5 text-primary" />}
          </div>
          {(!collapsed || isMobileOpen) && (
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
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden ml-auto text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || item.activePaths?.includes(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 lg:py-2 rounded-none transition-all duration-150 group
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                `}
              >
                <item.icon className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
                {(!collapsed || isMobileOpen) && <span className="text-[11px] font-bold uppercase tracking-tight">{item.label}</span>}
              </Link>
            );
          })}
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
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-3 lg:py-2 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
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
