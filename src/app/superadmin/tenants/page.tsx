'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Building2, Globe, Calendar, 
  Search, Edit2, Sparkles, Box, Users, 
  ChevronRight, Database, ShieldCheck, MapPin
} from 'lucide-react';
import Link from 'next/link';

import { TenantType, TenantSettings } from '@/lib/types/tenant';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  domain: string;
  org_type: string;
  org_size: number;
  tenant_type: TenantType;
  settings: TenantSettings;
  created_at: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/superadmin/tenants');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTenants(data);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTenant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tenant? All associated data will be lost.')) return;
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTenants(tenants.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting tenant:', err);
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase()) ||
    (t.org_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${editingTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTenant.name,
          org_type: editingTenant.org_type,
          domain: editingTenant.domain,
          org_size: editingTenant.org_size
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTenants(tenants.map(t => t.id === editingTenant.id ? data.tenant : t));
        setEditingTenant(null);
      }
    } catch (err) {
      console.error('Error updating tenant:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tighter flex items-center gap-4">
            <Database size={40} className="text-primary" /> Cluster Management
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
            Global orchestration of isolated institutional nodes
          </p>
        </div>
        <Link
          href="/superadmin/tenants/create"
          className="flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={16} strokeWidth={3} /> Propose New Instance
        </Link>
      </header>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Nodes', value: tenants.length, icon: Box, color: 'text-primary' },
          { label: 'Total Workforce', value: tenants.reduce((acc, t) => acc + (t.org_size || 0), 0), icon: Users, color: 'text-emerald-500' },
          { label: 'Network Integrity', value: '100%', icon: ShieldCheck, color: 'text-amber-500' },
          { label: 'Uptime', value: '99.99%', icon: Globe, color: 'text-indigo-500' }
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-xl shadow-sm group hover:border-primary/20 transition-all">
             <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{s.label}</p>
                <s.icon size={14} className={s.color} />
             </div>
             <p className="text-3xl font-black text-foreground tracking-tighter">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-3 bg-card border border-border px-4 py-3 rounded-xl flex-1 max-w-xl shadow-inner focus-within:border-primary transition-all">
              <Search size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Lookup by Identity, Subdomain, or Sector..."
                className="bg-transparent border-none outline-none text-sm w-full font-bold uppercase tracking-tight"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-border">
                <th className="px-8 py-5">Node Identity</th>
                <th className="px-8 py-5">Architecture</th>
                <th className="px-8 py-5">Context</th>
                <th className="px-8 py-5">Provisioned</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10 h-20 bg-muted/5"></td>
                  </tr>
                ))
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground italic text-sm font-bold uppercase tracking-widest">
                    Zero nodes found in current registry query.
                  </td>
                </tr>
              ) : filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-muted/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                        tenant.tenant_type === 'EDUCATION' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {tenant.tenant_type === 'EDUCATION' ? <Sparkles size={20} /> : <Building2 size={20} />}
                      </div>
                      <div>
                        <p className="font-black text-sm text-foreground tracking-tight">{tenant.name}</p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter mt-0.5">{tenant.subdomain}.hrms.cloud</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <span className={`text-[9px] px-3 py-1 rounded-xl font-black uppercase tracking-widest ${
                        tenant.org_type === 'hospital' ? 'bg-rose-500/10 text-rose-600' : 
                        tenant.org_type === 'university' ? 'bg-indigo-500/10 text-indigo-600' : 
                        'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {tenant.org_type || 'Custom'}
                      </span>
                      <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                        Blueprint: {tenant.settings?.onboarding?.template_used ? 'Standard' : 'Scratch'}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-foreground">
                          <Globe size={10} className="text-muted-foreground" />
                          {tenant.domain || 'no-domain.com'}
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                          <Users size={10} />
                          {tenant.org_size || 0} Staff
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <Calendar size={12} />
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setEditingTenant(tenant)}
                        className="p-3 bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all rounded-xl"
                        title="Configure Instance"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteTenant(tenant.id)}
                        className="p-3 bg-muted/50 border border-border text-muted-foreground hover:text-rose-500 hover:border-rose-500 transition-all rounded-xl opacity-0 group-hover:opacity-100"
                        title="Decommission Node"
                      >
                        <Trash2 size={14} />
                      </button>
                      <Link href={`#`} className="p-3 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all rounded-xl">
                         <ChevronRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
  
      {/* Modernized Edit Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-lg border border-border shadow-2xl rounded-xl p-10 space-y-8 animate-in zoom-in-95 duration-200">
            <div className="space-y-1">
               <h2 className="text-3xl font-black uppercase tracking-tighter">Adjust Node Config</h2>
               <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Modifying parameters for siloed instance: {editingTenant.id}</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entity Name</label>
                   <input
                     autoFocus
                     required
                     value={editingTenant.name}
                     onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                     className="w-full bg-muted/40 border border-border focus:border-primary px-4 py-3 rounded-xl outline-none transition-all font-bold text-sm"
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sector Type</label>
                   <input
                     required
                     value={editingTenant.org_type || ''}
                     onChange={(e) => setEditingTenant({ ...editingTenant, org_type: e.target.value.toLowerCase() })}
                     className="w-full bg-muted/40 border border-border focus:border-primary px-4 py-3 rounded-xl outline-none transition-all font-bold text-sm"
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Domain</label>
                   <input
                     required
                     value={editingTenant.domain || ''}
                     onChange={(e) => setEditingTenant({ ...editingTenant, domain: e.target.value })}
                     className="w-full bg-muted/40 border border-border focus:border-primary px-4 py-3 rounded-xl outline-none transition-all font-bold text-sm"
                   />
                 </div>

                 <div className="space-y-2 col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Workforce Scale</label>
                   <input
                     required
                     type="number"
                     value={editingTenant.org_size || 0}
                     onChange={(e) => setEditingTenant({ ...editingTenant, org_size: parseInt(e.target.value) })}
                     className="w-full bg-muted/40 border border-border focus:border-primary px-4 py-3 rounded-xl outline-none transition-all font-bold text-sm"
                   />
                 </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="flex-1 py-4 bg-muted hover:bg-muted/80 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Abadon
                </button>
                <button
                  disabled={isUpdating}
                  type="submit"
                  className="flex-1 py-4 bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Synchronizing...' : 'Commit Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
