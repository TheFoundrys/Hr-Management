'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  KeyRound,
  Building2,
  Users,
  FileWarning,
  GitBranch,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import { ROLE_PERMISSIONS, type Role } from '@/lib/auth/rbac';
import { useAuthStore } from '@/lib/stores/authStore';
import { hasAnyPermission, hasPermission } from '@/lib/auth/rbac';

const ROLE_ORDER: Role[] = [
  'SUPER_ADMIN',
  'GLOBAL_ADMIN',
  'ADMIN',
  'DIRECTOR',
  'PRINCIPAL',
  'HOD',
  'HR_MANAGER',
  'HR',
  'HR_EXECUTIVE',
  'MANAGER',
  'TEAM_LEAD',
  'PAYROLL_ADMIN',
  'IT_ADMIN',
  'LEARNING_ADMIN',
  'FACULTY',
  'TEACHING',
  'STAFF',
  'NON_TEACHING',
  'EMPLOYEE',
  'EXPENSE_MANAGER',
  'PENDING',
];

export default function AccessControlPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'overview' | 'matrix'>('overview');
  const rows = ROLE_ORDER.filter((r) => ROLE_PERMISSIONS[r]?.length);

  const isEducation = user?.tenantType === 'EDUCATION';
  const role = user?.role || '';
  const custom = user?.tenantSettings?.roles;

  const canManageSystem = hasPermission(role, 'MANAGE_SYSTEM', custom);
  const canManageEmployees = hasAnyPermission(role, ['MANAGE_EMPLOYEES', 'MANAGE_SYSTEM'], custom);
  const canManageLeave = hasPermission(role, 'MANAGE_LEAVE', custom);
  const canSeeOrgChart = hasAnyPermission(role, ['VIEW_TEAM', 'VIEW_ALL_EMPLOYEES'], custom);

  const overviewCards = useMemo(() => {
    const cards: {
      key: string;
      href: string;
      icon: typeof Building2;
      kicker: string;
      title: string;
      body: string;
    }[] = [];

    if (isEducation && canManageSystem) {
      cards.push({
        key: 'structure',
        href: '/admin/scheduling/entities',
        icon: Building2,
        kicker: 'Structure',
        title: 'Organization & entities',
        body: 'Departments, courses, groups, and related scheduling data (education tenants).',
      });
    }

    if (canManageEmployees) {
      cards.push({
        key: 'people',
        href: '/employees',
        icon: Users,
        kicker: 'People',
        title: 'Directory & access roles',
        body: 'Staff records and login roles (users.role). Anyone with Manage employees or Manage system can open this hub.',
      });
    }

    if (canSeeOrgChart) {
      cards.push({
        key: 'org',
        href: '/team/tree',
        icon: GitBranch,
        kicker: 'Org chart',
        title: 'Reporting tree',
        body: 'Reporting lines and access role context (requires team or directory visibility).',
      });
    }

    if (canManageLeave) {
      cards.push({
        key: 'leave',
        href: '/leave?tab=manage',
        icon: KeyRound,
        kicker: 'Leave',
        title: 'HR leave tools',
        body: 'Approvals and balances use Manage leave permission.',
      });
    }

    if (canManageSystem) {
      cards.push({
        key: 'custom',
        href: '#',
        icon: FileWarning,
        kicker: 'Custom roles',
        title: 'Tenant overrides',
        body: 'Advanced mappings live in tenant settings and merge at runtime via hasPermission.',
      });
    }

    return cards;
  }, [isEducation, canManageSystem, canManageEmployees, canSeeOrgChart, canManageLeave]);

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <header className="border-b border-border pb-6">
        <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Access control
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Defaults live in code; tenant overrides use <code className="text-xs bg-muted px-1 py-0.5 rounded">roles</code>{' '}
          in tenant settings. Staff titles stay on the employee record; login capability uses{' '}
          <span className="font-medium text-foreground">users.role</span>.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest border rounded-xl transition-colors ${
              tab === 'overview'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab('matrix')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest border rounded-xl transition-colors ${
              tab === 'matrix'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <Table2 className="w-4 h-4" />
            Role matrix
          </button>
        </div>
      </header>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overviewCards.length === 0 ? (
            <p className="text-sm text-muted-foreground md:col-span-2">No shortcuts match your role for this tenant.</p>
          ) : (
            overviewCards.map((c) => {
              const CardIcon = c.icon;
              const Inner = (
                <>
                  <CardIcon className="w-10 h-10 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{c.kicker}</p>
                    <p className="font-semibold text-foreground mt-1">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.body}</p>
                  </div>
                </>
              );
              if (c.href === '#') {
                return (
                  <div key={c.key} className="glass-card rounded-xl p-5 flex gap-4 md:col-span-2">
                    {Inner}
                  </div>
                );
              }
              return (
                <Link
                  key={c.key}
                  href={c.href}
                  className="glass-card rounded-xl p-5 flex gap-4 hover:border-primary/40 transition-colors"
                >
                  {Inner}
                </Link>
              );
            })
          )}
        </div>
      )}

      {tab === 'matrix' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Default role → permissions</h2>
            <p className="text-xs text-muted-foreground mt-1">Reference matrix (read-only).</p>
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Permissions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((role) => (
                  <tr key={role} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">{role}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(ROLE_PERMISSIONS[role] || []).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
