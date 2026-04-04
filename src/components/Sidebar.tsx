'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  LayoutDashboard, Users, Clock, CalendarOff, Wallet,
  LogOut, GraduationCap, ChevronLeft, Menu, Fingerprint,
  FileText, UserCircle, Shield, Layers, CalendarDays
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'HOD', 'HR', 'STAFF'] },
  { href: '/team', label: 'My Team', icon: Users, roles: ['ADMIN', 'HOD', 'HR', 'STAFF'] },
  { href: '/employees', label: 'Employees', icon: Users, roles: ['ADMIN', 'HR'] },
  { href: '/attendance', label: 'Attendance', icon: Clock, roles: ['ADMIN', 'HOD', 'HR', 'STAFF'] },
  { href: '/leave', label: 'Leave', icon: CalendarOff, roles: ['ADMIN', 'HOD', 'HR', 'STAFF'] },
  { href: '/payslips', label: 'Payslips', icon: FileText, roles: ['ADMIN', 'HOD', 'HR', 'STAFF'] },
  { href: '/salary-structure', label: 'Salary Structure', icon: Wallet, roles: ['ADMIN', 'HR'] },
  { href: '/biometric', label: 'Biometric', icon: Fingerprint, roles: ['ADMIN'] },
  { href: '/admin/attendance/network', label: 'Network Security', icon: Shield, roles: ['ADMIN'] },
  { href: '/profile', label: 'Profile', icon: UserCircle, roles: ['ADMIN', 'HOD', 'HR', 'STAFF'] },
  { href: '/admin/scheduling', label: 'Class Scheduling', icon: CalendarOff, roles: ['ADMIN', 'HOD'] },
  { href: '/admin/scheduling/entities', label: 'Master Registry', icon: Layers, roles: ['ADMIN'] },
  { href: '/faculty/schedule', label: 'My Schedule', icon: CalendarDays, roles: ['HOD', 'STAFF', 'FACULTY'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const baseRole = (user?.role || 'STAFF').toUpperCase();
  const filteredNav = navItems.filter((item) => item.roles.includes(baseRole));

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    router.push('/login');
  };

  return (
    <>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside
        className={`fixed top-0 left-0 h-full bg-slate-950 border-r border-slate-800 z-40 transition-all duration-300 flex flex-col
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-64'}
        `}
      >
        <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-800">
          <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center shrink-0 shadow-lg">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-lg text-white tracking-tight">University HR</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block ml-auto text-slate-500 hover:text-white transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 group
                  ${isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'}
                `}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {!collapsed && <span className="text-sm font-semibold">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          {!collapsed && (
            <div className="mb-4 px-2">
              <p className="text-sm font-bold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">{user?.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-sm font-bold">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
