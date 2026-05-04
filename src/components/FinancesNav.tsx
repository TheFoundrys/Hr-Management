'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react';
import { hasPermission, type Permission } from '@/lib/auth/rbac';
import { useAuthStore } from '@/lib/stores/authStore';

const ITEMS = [
  { label: 'Salary Structure', href: '/salary-structure', icon: CreditCard, permission: 'MANAGE_PAYROLL' },
  { label: 'Payroll', href: '/payroll', icon: FileSpreadsheet, permission: 'MANAGE_PAYROLL' },
  { label: 'Payslips', href: '/payslips', icon: FileText, permission: 'VIEW_OWN_PAYSLIP' },
  { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'VIEW_REPORTS' },
];

export function FinancesNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const visibleItems = ITEMS.filter((item) =>
    hasPermission(user?.role || '', item.permission as Permission, user?.tenantSettings?.roles)
  );

  return (
    <div className="w-full bg-card border border-border rounded-xl p-2 mb-6 overflow-hidden shadow-sm">
      <div className="flex items-center justify-start gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl whitespace-nowrap transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
              `}
            >
              <item.icon size={16} />
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
