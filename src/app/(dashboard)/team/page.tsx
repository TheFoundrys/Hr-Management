'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Mail, Phone, Building2, BadgeCheck, Loader2, 
  ArrowRight, Sparkles, Binary, Orbit, ShieldCheck,
  Zap, Share2, Activity, ChevronDown, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department_name: string;
  designation_name: string;
  university_id: string;
  role: string;
  level?: number;
  reports_count: number;
}

export default function MyTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tree' | 'grid'>('tree');

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
      }
    } catch (err) {
      console.error('Failed to fetch team');
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (members: any[]) => {
    const map: any = {};
    const roots: any[] = [];
    
    members.forEach(m => {
      map[m.id] = { ...m, children: [] };
    });
    
    members.forEach(m => {
      if (m.manager_id && map[m.manager_id]) {
        map[m.manager_id].children.push(map[m.id]);
      } else {
        roots.push(map[m.id]);
      }
    });
    
    return roots;
  };

  const treeData = buildTree(team);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Organizational Hierarchy
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Visualizing the reporting structure of your department.</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-lg border shadow-sm">
           <button 
             onClick={() => setView('tree')}
             className={`flex items-center gap-2 px-6 py-2 rounded-md text-xs font-bold transition-all ${view === 'tree' ? 'bg-primary text-secondary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
           >
             <Share2 size={14} /> Tree View
           </button>
           <button 
             onClick={() => setView('grid')}
             className={`flex items-center gap-2 px-6 py-2 rounded-md text-xs font-bold transition-all ${view === 'grid' ? 'bg-primary text-secondary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
           >
             <Binary size={14} /> Grid View
           </button>
        </div>
      </header>

      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-4 opacity-40">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <span className="text-sm font-bold uppercase tracking-widest animate-pulse">Mapping Hierarchy...</span>
        </div>
      ) : team.length === 0 ? (
        <div className="bg-muted/50 border-2 border-dashed rounded-2xl p-24 text-center">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">No Team Members Found</p>
        </div>
      ) : view === 'tree' ? (
        <div className="overflow-x-auto pb-10 scrollbar-hide">
          <div className="min-w-fit flex justify-center p-8">
             <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
                {treeData.map(root => (
                  <TreeNode key={root.id} member={root} />
                ))}
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {team.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode({ member }: { member: any }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = member.children && member.children.length > 0;

  return (
    <div className="flex flex-col items-center relative">
      {/* Node Card */}
      <div className="relative z-10 mx-6">
         <div className={`
           w-72 bg-card border rounded-2xl p-6 shadow-sm transition-all duration-300 group relative
           ${hasChildren ? 'border-primary/20 bg-primary/[0.02]' : 'hover:bg-muted/30'}
           hover:border-primary/40 hover:shadow-md
         `}>
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border border-primary/20 shadow-sm transition-transform duration-300 group-hover:scale-105">
                 {member.first_name[0]}{member.last_name[0]}
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                     <h4 className="font-bold text-sm truncate text-foreground leading-tight">{member.first_name} {member.last_name}</h4>
                     {member.role === 'admin' && <ShieldCheck size={12} className="text-primary opacity-60" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-60 leading-tight truncate">{member.designation_name || 'Staff'}</p>
                  <div className="mt-3">
                    <span className="text-[9px] bg-muted text-muted-foreground border px-2 py-0.5 rounded font-bold uppercase tracking-[0.1em]">{member.university_id}</span>
                  </div>
               </div>
               <Link href={`/employees/${member.university_id}`} className="p-2 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-lg transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 duration-300">
                 <ChevronRight className="w-5 h-5" />
               </Link>
            </div>
            
            {hasChildren && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-card border rounded-full flex items-center justify-center shadow-sm hover:border-primary/40 hover:text-primary transition-all z-20 group/btn"
              >
                <div className="text-xs transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                   {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </button>
            )}
         </div>
      </div>

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div className="pt-12 flex flex-nowrap relative">
          <div className="absolute top-0 left-1/2 w-px h-12 bg-primary/20 -translate-x-1/2"></div>
          
          {member.children.length > 1 && (
            <div 
              className="absolute top-12 h-px bg-primary/20"
              style={{
                left: `calc(100% / ${member.children.length} / 2)`,
                right: `calc(100% / ${member.children.length} / 2)`
              }}
            ></div>
          )}

          <div className="flex gap-10">
            {member.children.map((child: any) => (
              <div key={child.id} className="relative">
                <div className="absolute -top-12 left-1/2 w-px h-12 bg-primary/20 -translate-x-1/2 shadow-sm"></div>
                <TreeNode member={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: any }) {
  return (
    <div className="bg-card group hover:bg-primary/[0.02] transition-all duration-300 rounded-2xl border p-8 shadow-sm relative overflow-hidden">
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl border border-primary/20 shadow-sm group-hover:scale-105 transition-transform duration-300">
          {member.first_name[0]}{member.last_name[0]}
        </div>
        <div className="flex flex-col items-end gap-1.5">
           <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
             {member.reports_count > 0 ? 'Manager' : 'Staff'}
           </span>
           <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-40">Tier {member.level || 1}</span>
        </div>
      </div>
      
      <div className="space-y-1 mb-8 relative z-10">
         <h3 className="text-xl font-bold text-foreground leading-tight truncate">{member.first_name} {member.last_name}</h3>
         <p className="text-[10px] text-primary/60 uppercase font-black tracking-widest">{member.university_id}</p>
      </div>

      <div className="space-y-3 mb-8 relative z-10 py-4 border-t border-b border-muted">
        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
           <BadgeCheck className="w-4 h-4 text-primary/60" />
           <span className="uppercase tracking-wider truncate">{member.designation_name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
           <Building2 className="w-4 h-4 text-indigo-500/60" />
           <span className="uppercase tracking-wider opacity-80 truncate">{member.department_name}</span>
        </div>
      </div>

      <Link href={`/employees/${member.university_id}`} className="w-full py-4 bg-muted hover:bg-primary hover:text-secondary rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 shadow-sm group/btn">
        View Profile <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
