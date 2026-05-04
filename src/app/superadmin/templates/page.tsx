'use client';

import { useState, useEffect } from 'react';
import { 
  Layers, Plus, Search, Building2, Trash2, 
  Settings, Loader2, CheckCircle2, ChevronRight,
  Database, Briefcase, GraduationCap, HeartPulse
} from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/superadmin/templates');
        const data = await res.json();
        if (data.success) setTemplates(data.templates);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const getIcon = (orgType: string) => {
    switch (orgType?.toLowerCase()) {
      case 'university': return <GraduationCap className="w-5 h-5" />;
      case 'hospital': return <HeartPulse className="w-5 h-5" />;
      case 'corporate': return <Briefcase className="w-5 h-5" />;
      default: return <Building2 className="w-5 h-5" />;
    }
  };

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.org_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-4">
            <Layers size={40} className="text-primary" /> Sector Blueprints
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
            Manage architectural templates for multitenant provisioning
          </p>
        </div>
        <button 
          className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={16} strokeWidth={3} /> Define New Sector
        </button>
      </header>

      {/* Control Bar */}
      <div className="bg-card border border-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
         <div className="flex items-center gap-3 bg-muted/30 border border-border px-4 py-2.5 rounded-xl flex-1 max-w-md shadow-inner focus-within:border-primary transition-all">
            <Search size={16} className="text-muted-foreground" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by blueprint name or sector..." 
              className="bg-transparent border-none outline-none text-sm w-full font-bold uppercase tracking-tight"
            />
         </div>
         <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span>Total: {templates.length} Active</span>
            <div className="w-px h-4 bg-border" />
            <span>Public: {templates.filter(t => t.is_public).length}</span>
         </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-40 text-center"><Loader2 className="animate-spin inline-block text-primary" size={40} /></div>
        ) : filtered.map(t => (
          <div key={t.id} className="bg-card border border-border p-8 rounded-xl hover:border-primary transition-all group relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               {getIcon(t.org_type)}
            </div>

            <div className="space-y-4 flex-1">
               <div className="flex items-center gap-2 px-3 py-1 bg-muted w-fit rounded-xl">
                  {getIcon(t.org_type)}
                  <span className="text-[9px] font-black uppercase tracking-widest">{t.org_type}</span>
               </div>

               <div className="space-y-1">
                  <h3 className="text-xl font-black text-foreground tracking-tight">{t.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium line-clamp-2">{t.description || 'Standard architectural blueprint for organizational hierarchy.'}</p>
               </div>

               <div className="grid grid-cols-2 gap-2 pt-4">
                  <div className="p-3 bg-muted/30 border border-border text-center">
                     <p className="text-[10px] font-black uppercase text-muted-foreground">Status</p>
                     <p className="text-xs font-bold text-emerald-500 mt-1 uppercase">Operational</p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border text-center">
                     <p className="text-[10px] font-black uppercase text-muted-foreground">Access</p>
                     <p className="text-xs font-bold text-primary mt-1 uppercase">{t.is_public ? 'Public' : 'Private'}</p>
                  </div>
               </div>
            </div>

            <div className="mt-8 flex items-center gap-2">
               <Link href={`/superadmin/templates/${t.id}`} className="flex-1">
                  <button className="w-full py-3 bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all flex items-center justify-center gap-2">
                     <Settings size={14} /> Configure
                  </button>
               </Link>
               <button className="w-12 h-3/4 py-3 border border-border hover:bg-rose-500/10 hover:border-rose-500 hover:text-rose-500 transition-all flex items-center justify-center">
                  <Trash2 size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="bg-card border border-border border-dashed p-40 text-center space-y-4">
           <Database size={48} className="mx-auto text-muted-foreground opacity-20" />
           <div className="space-y-1">
              <p className="text-xl font-black text-foreground">No Blueprints Found</p>
              <p className="text-sm text-muted-foreground">Adjust your search or define a new sector blueprint.</p>
           </div>
        </div>
      )}
    </div>
  );
}
