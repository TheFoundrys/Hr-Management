'use client';

import { useState, useEffect, use } from 'react';
import { 
  ChevronLeft, Loader2, Settings, Layers, 
  Building2, Briefcase, Plus, Trash2, 
  CheckCircle2, AlertCircle, Save, Share2,
  Database, GitBranch, Layout, Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TemplateConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('hierarchy');

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/superadmin/templates/${id}`);
        const json = await res.json();
        if (json.success) setData(json.template);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        alert('Blueprint saved successfully');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!data) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <AlertCircle className="w-16 h-16 text-rose-500" />
      <h2 className="text-2xl font-black uppercase tracking-tighter">Blueprint Not Found</h2>
      <Link href="/superadmin/templates" className="text-primary hover:underline font-bold text-sm uppercase">Back to Library</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <Link 
            href="/superadmin/templates" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Library</span>
          </Link>
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Settings size={28} />
             </div>
             <div>
                <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">{data.name}</h1>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">{data.org_type} • System Blueprint</p>
             </div>
          </div>
        </div>

        <div className="flex gap-2">
           <button className="px-6 py-4 border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all">
              <Share2 size={14} className="inline mr-2" /> Export JSON
           </button>
           <button 
             onClick={handleSave}
             disabled={saving}
             className="px-8 py-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
           >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Commit Changes
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border bg-muted/20 p-1">
         {[
           { id: 'hierarchy', label: 'Department Tree', icon: GitBranch },
           { id: 'designations', label: 'Designations', icon: Briefcase },
           { id: 'roles', label: 'Available Roles', icon: Users },
           { id: 'labels', label: 'Custom Labels', icon: Layout }
         ].map((t) => (
           <button
             key={t.id}
             onClick={() => setActiveTab(t.id)}
             className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
               activeTab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
             }`}
           >
              <t.icon size={14} /> {t.label}
           </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
         
         <div className="lg:col-span-8 space-y-6">
            {activeTab === 'hierarchy' && (
              <div className="bg-card border border-border p-8 rounded-xl shadow-2xl space-y-8">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Organizational Tree</h3>
                    <button className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-muted hover:bg-primary hover:text-white transition-all">
                       <Plus size={12} className="inline mr-1" /> Add Root Dept
                    </button>
                 </div>

                 <div className="space-y-4">
                    {data.departments.filter((d: any) => !d.parent_id).map((dept: any) => (
                      <div key={dept.id} className="border-l-2 border-primary/20 pl-6 space-y-4">
                         <div className="flex items-center justify-between p-4 bg-muted/30 border border-border group hover:border-primary/50 transition-all">
                            <div className="flex items-center gap-3">
                               <Building2 size={16} className="text-primary" />
                               <span className="text-xs font-black uppercase">{dept.name}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-all">
                               <button className="p-1.5 hover:text-primary"><Plus size={14} /></button>
                               <button className="p-1.5 hover:text-rose-500"><Trash2 size={14} /></button>
                            </div>
                         </div>
                         {/* Children */}
                         <div className="pl-6 space-y-3">
                            {data.departments.filter((d: any) => d.parent_id === dept.id).map((child: any) => (
                              <div key={child.id} className="flex items-center justify-between p-3 border border-border hover:border-primary/30 transition-all bg-card/50">
                                 <div className="flex items-center gap-3">
                                    <div className="w-1 h-1 bg-primary" />
                                    <span className="text-[10px] font-bold text-foreground">{child.name}</span>
                                 </div>
                                 <button className="p-1 text-muted-foreground hover:text-rose-500"><Trash2 size={12} /></button>
                              </div>
                            ))}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'designations' && (
               <div className="bg-card border border-border p-8 rounded-xl shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Standard Roles</h3>
                    <button className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-muted hover:bg-primary hover:text-white transition-all">
                       <Plus size={12} className="inline mr-1" /> Add Role
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {data.designations.map((des: any) => (
                       <div key={des.id} className="p-4 border border-border flex items-center justify-between group hover:bg-muted/10">
                          <span className="text-xs font-bold text-foreground uppercase tracking-tight">{des.name}</span>
                          <button className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeTab === 'roles' && (
                <div className="bg-card border border-border p-8 rounded-xl shadow-2xl space-y-6">
                   <div className="flex items-center justify-between">
                     <h3 className="text-xl font-black uppercase tracking-tighter">System Roles</h3>
                     <button 
                        onClick={() => {
                           const role = prompt('Enter new role (e.g. MANAGER)');
                           if (role) {
                              const roles = [...(data.available_roles || []), role.toUpperCase()];
                              setData({ ...data, available_roles: roles });
                           }
                        }}
                        className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-muted hover:bg-primary hover:text-white transition-all"
                     >
                        <Plus size={12} className="inline mr-1" /> Add Role
                     </button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(data.available_roles || []).map((role: string, idx: number) => (
                        <div key={idx} className="p-4 border border-border flex items-center justify-between group hover:bg-muted/10">
                           <span className="text-xs font-bold text-foreground uppercase tracking-tight">{role}</span>
                           <button 
                              onClick={() => {
                                 const roles = data.available_roles.filter((_: any, i: number) => i !== idx);
                                 setData({ ...data, available_roles: roles });
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 transition-all"
                           >
                              <Trash2 size={14} />
                           </button>
                        </div>
                      ))}
                   </div>
                   <p className="text-[9px] text-muted-foreground font-bold italic">Note: These roles control RBAC access levels for users in this sector.</p>
                </div>
             )}

            {activeTab === 'labels' && (
               <div className="bg-card border border-border p-8 rounded-xl shadow-2xl space-y-8">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Sector Vocabulary</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest -mt-4">Mapping depth levels to sector-specific terminology</p>
                  
                  <div className="space-y-6">
                     {[1, 2, 3].map((level) => (
                       <div key={level} className="grid grid-cols-3 gap-6 items-center">
                          <div className="text-[10px] font-black uppercase text-muted-foreground">Level {level} Entity</div>
                          <div className="col-span-2">
                             <input 
                               type="text" 
                               value={data.hierarchy_labels?.[`level_${level}`] || ''}
                               placeholder={`e.g. ${level === 1 ? 'Faculty' : level === 2 ? 'Department' : 'Team'}`}
                               onChange={(e) => {
                                  const labels = { ...data.hierarchy_labels, [`level_${level}`]: e.target.value };
                                  setData({ ...data, hierarchy_labels: labels });
                               }}
                               className="w-full bg-muted/20 border border-border px-4 py-3 text-xs font-bold uppercase outline-none focus:border-primary transition-all"
                             />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}
         </div>

         {/* Blueprint Meta Sidebar */}
         <div className="lg:col-span-4 space-y-6">
            <div className="bg-muted/30 border border-border p-6 rounded-xl space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-3">Blueprint Specs</h4>
               
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-muted-foreground">System Name</label>
                     <input 
                       type="text" 
                       value={data.name} 
                       onChange={(e) => setData({ ...data, name: e.target.value })}
                       className="w-full bg-card border border-border px-3 py-2 text-xs font-bold outline-none"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-muted-foreground">Industry Sector</label>
                     <input 
                       type="text" 
                       value={data.org_type} 
                       onChange={(e) => setData({ ...data, org_type: e.target.value })}
                       className="w-full bg-card border border-border px-3 py-2 text-xs font-bold outline-none"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-muted-foreground">Description</label>
                     <textarea 
                       rows={4}
                       value={data.description} 
                       onChange={(e) => setData({ ...data, description: e.target.value })}
                       className="w-full bg-card border border-border px-3 py-2 text-xs font-medium outline-none resize-none"
                     />
                  </div>
               </div>

               <div className="pt-6 border-t border-border space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                     <span className="text-muted-foreground">Public Access</span>
                     <span className="text-emerald-500">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                     <span className="text-muted-foreground">Creation Date</span>
                     <span className="text-foreground">{new Date(data.created_at).toLocaleDateString()}</span>
                  </div>
               </div>
            </div>

            <div className="p-6 border border-border border-dashed space-y-4">
               <div className="flex items-center gap-3 text-amber-500">
                  <AlertCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-tight">System Constraints</span>
               </div>
               <p className="text-[9px] text-muted-foreground font-bold italic leading-relaxed">
                  Modifying this blueprint will affect all future tenants onboarded using this template. Active tenants will not be affected.
               </p>
            </div>
         </div>

      </div>
    </div>
  );
}
