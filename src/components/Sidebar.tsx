'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  LayoutDashboard, Users, Clock, CalendarOff, Wallet, FileText,
  BarChart3, LogOut, GraduationCap, ChevronLeft, Menu, Fingerprint,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teaching', 'non-teaching'] },
  { href: '/employees', label: 'Employees', icon: Users, roles: ['admin'] },
  { href: '/attendance', label: 'Attendance', icon: Clock, roles: ['admin', 'teaching', 'non-teaching'] },
  { href: '/leave', label: 'Leave', icon: CalendarOff, roles: ['admin', 'teaching', 'non-teaching'] },
  { href: '/payroll', label: 'Payroll', icon: Wallet, roles: ['admin'] },
  { href: '/documents', label: 'Documents', icon: FileText, roles: ['admin', 'teaching', 'non-teaching'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin'] },
  { href: '/biometric', label: 'Biometric', icon: Fingerprint, roles: ['admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role || 'teaching'));

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-xl"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside
        className={`fixed top-0 left-0 h-full glass-sidebar z-40 transition-all duration-300 flex flex-col
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-lg text-white">UniStaff</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block ml-auto text-white/30 hover:text-white/70 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'}
                `}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-400' : 'text-white/40 group-hover:text-white/70'}`} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          {!collapsed && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-white/80 truncate">{user?.name}</p>
              <p className="text-xs text-white/40 capitalize">{user?.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/50 hover:text-danger-500 hover:bg-danger-500/10 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
