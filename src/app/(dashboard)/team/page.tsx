'use client';
import { useState, useEffect } from 'react';
import { Users, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function MyTeamPage() {
  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/team')
      .then(r => r.json())
      .then(d => d.success && setTeam(d.team))
      .catch(console.error);
  }, []);

  const buildTree = (members: any[]) => {
    const map: any = {}, roots: any[] = [];
    members.forEach(m => map[m.id] = { ...m, children: [] });
    members.forEach(m => m.manager_id && map[m.manager_id] ? map[m.manager_id].children.push(map[m.id]) : roots.push(map[m.id]));
    return roots;
  };

  if (!team.length) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="max-w-auto space-y-6 animate-fade-in">
      <header className="pb-6 border-b border-border">
        <h1 className="text-2xl font-black flex items-center gap-3 text-foreground uppercase tracking-tight">
          <Users className="text-primary" /> Team Hierarchy
        </h1>
      </header>
      <div className="space-y-4">
        {buildTree(team).map(root => <TreeNode key={root.id} node={root} />)}
      </div>
    </div>
  );
}

function TreeNode({ node }: { node: any }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all shadow-soft group">
        <div className="flex items-center gap-4">
          {hasChildren ? (
            <button onClick={() => setOpen(!open)} className="w-6 h-6 flex items-center justify-center rounded bg-muted text-muted-foreground hover:text-primary transition-colors border border-border">
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : <div className="w-6" />}

          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
            {node.first_name[0]}{node.last_name[0]}
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">{node.first_name} {node.last_name}</h3>
            <div className="flex gap-2 items-center mt-1">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none">{node.designation_name || 'Staff'}</span>
              <span className="text-[10px] bg-muted text-foreground border border-border px-2 py-0.5 rounded font-mono font-bold">{node.university_id}</span>
            </div>
          </div>
        </div>
        <Link href={`/employees/${node.university_id}`} className="text-[10px] font-black uppercase tracking-widest px-6 py-2 bg-muted border border-border rounded-xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-soft">
          Profile
        </Link>
      </div>

      {open && hasChildren && (
        <div className="border-l-2 border-border ml-7 pl-6 space-y-3 mt-3">
          {node.children.map((child: any) => <TreeNode key={child.id} node={child} />)}
        </div>
      )}
    </div>
  );
}
