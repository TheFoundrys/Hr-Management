'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react';

const ITEMS = [
  { label: 'Salary Structure', href: '/salary-structure', icon: CreditCard },
  { label: 'Payroll', href: '/payroll', icon: FileSpreadsheet },
  { label: 'Payslips', href: '/payslips', icon: FileText },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
];

export function FinancesNav() {
  const pathname = usePathname();

  return (
    <div className="w-full bg-card border border-border rounded-none p-2 mb-6 overflow-hidden shadow-sm">
      <div className="flex items-center justify-start gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-none whitespace-nowrap transition-all duration-200
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
