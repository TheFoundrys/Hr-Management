'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, GitBranch, Loader2 } from 'lucide-react';

type TeamMember = {
  id: string;
  manager_id: string | null;
  first_name: string;
  last_name: string;
  name?: string;
  identifier?: string;
  designation_name?: string | null;
  department_name?: string | null;
  role?: string | null;
  access_role?: string | null;
  reports_count?: number;
  children?: TeamMember[];
};

function buildTree(members: TeamMember[]): TeamMember[] {
  const map: Record<string, TeamMember> = {};
  const roots: TeamMember[] = [];
  members.forEach((m) => {
    map[m.id] = { ...m, children: [] };
  });
  members.forEach((m) => {
    const node = map[m.id];
    if (m.manager_id && map[m.manager_id]) {
      map[m.manager_id].children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function OrgNode({ node, depth = 0 }: { node: TeamMember; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const access = (node.access_role || 'EMPLOYEE').replace(/_/g, ' ');
  const staffRole = (node.role || '—').replace(/_/g, ' ');

  return (
    <div className="flex flex-col items-center min-w-0">
      <div className="relative w-full max-w-[240px] rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-tight text-foreground truncate">
              {node.first_name} {node.last_name}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 truncate">
              {node.designation_name || 'Staff'}
            </p>
            {node.department_name && (
              <p className="text-[9px] text-muted-foreground/80 mt-0.5 truncate">{node.department_name}</p>
            )}
          </div>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="shrink-0 p-1.5 rounded-xl border border-border bg-muted/50 text-muted-foreground hover:text-primary"
              aria-expanded={open}
              aria-label={open ? 'Collapse team' : 'Expand team'}
            >
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border border-border bg-muted/40 text-foreground">
            Staff: {staffRole}
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border border-primary/20 bg-primary/10 text-primary">
            Access: {access}
          </span>
        </div>
        <div className="mt-3 flex justify-between items-center gap-2">
          <span className="text-[9px] text-muted-foreground font-mono truncate">{node.identifier}</span>
          <Link
            href={`/employees/${node.id}`}
            className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline shrink-0"
          >
            Profile
          </Link>
        </div>
      </div>

      {open && hasChildren ? (
        <div className="mt-4 flex flex-col items-center w-full">
          <div className="h-4 w-px bg-border" aria-hidden />
          <div className="flex flex-row flex-wrap justify-center gap-6 pt-4 mt-1 w-full border-t border-border">
            {children.map((child) => (
              <OrgNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TeamTreePage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/team/tree');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load org tree');
        if (!cancelled && data.success) setTeam(data.team || []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const roots = useMemo(() => buildTree(team), [team]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/team" className="text-sm text-primary mt-4 inline-block font-semibold">
          Back to team
        </Link>
      </div>
    );
  }

  if (!team.length) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-4">
        <p className="text-sm text-muted-foreground">No people in scope for an org chart yet.</p>
        <Link href="/team" className="text-sm text-primary font-semibold">
          Back to team
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[100vw] space-y-6 animate-fade-in pb-12 px-4 md:px-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
            <GitBranch className="text-primary shrink-0" />
            Org chart
          </h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-xl">
            Reporting lines with staff role (job) and login access role. Wider trees scroll horizontally on small screens.
          </p>
        </div>
        <Link
          href="/team"
          className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 px-4 py-2 hover:bg-primary/5 w-fit"
        >
          List view
        </Link>
      </header>

      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex flex-row flex-wrap justify-center gap-10 min-w-min py-4">
          {roots.map((root) => (
            <OrgNode key={root.id} node={root} depth={0} />
          ))}
        </div>
      </div>
    </div>
  );
}
