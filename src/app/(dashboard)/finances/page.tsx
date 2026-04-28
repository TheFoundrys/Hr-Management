'use client';

import { FinancesNav } from '@/components/FinancesNav';
import { CreditCard, FileSpreadsheet, FileText, BarChart3, TrendingUp, Wallet, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const STATS = [
  { label: 'Total Payout', value: '₹12.4L', change: '+4.2%', icon: Wallet },
  { label: 'Active Employees', value: '154', change: '0%', icon: ShieldCheck },
  { label: 'Pending Approvals', value: '3', change: '-2', icon: TrendingUp },
];

const TOOLS = [
  { label: 'Salary Structure', desc: 'Configure base pay and allowances', href: '/salary-structure', icon: CreditCard, color: 'bg-blue-500' },
  { label: 'Payroll', desc: 'Execute monthly disbursements', href: '/payroll', icon: FileSpreadsheet, color: 'bg-emerald-500' },
  { label: 'Payslips', desc: 'Manage and download statements', href: '/payslips', icon: FileText, color: 'bg-indigo-500' },
  { label: 'Reports', desc: 'Financial data and analytics', href: '/reports', icon: BarChart3, color: 'bg-amber-500' },
];

export default function FinancesHub() {
  return (
    <div className="w-full py-8 px-6 space-y-10 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Financial Hub</h1>
        <p className="text-sm text-muted-foreground">Centralized management for salaries, payroll, and reports</p>
      </div>

      <FinancesNav />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {STATS.map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-5">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <span className={`text-[10px] font-bold ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOOLS.map((tool, i) => (
          <Link 
            key={i} 
            href={tool.href}
            className="group bg-card border border-border rounded-xl p-6 flex flex-col items-start hover:bg-muted/50 transition-all shadow-sm"
          >
            <div className={`w-10 h-10 ${tool.color} text-white rounded-lg flex items-center justify-center mb-4 shadow-sm`}>
              <tool.icon size={20} />
            </div>
            <h3 className="text-sm font-bold text-foreground">{tool.label}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tool.desc}</p>
            <div className="mt-4 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
              Open Tool →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
