'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Globe, Calendar, Link as LinkIcon, Search, MoreVertical, Edit2, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  tenant_type: 'EDUCATION' | 'COMPANY';
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
          tenantType: editingTenant.tenant_type
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

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Multi-Tenant Management</h1>
          <p className="text-muted-foreground mt-1">Manage company isolation and administrative access.</p>
        </div>
        <Link
          href="/superadmin/tenants/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Create New Tenant
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-semibold">Total Tenants</p>
          <p className="text-3xl font-black mt-1">{tenants.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-semibold">System Capacity</p>
          <p className="text-3xl font-black mt-1">Unlimited</p>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Globe className="w-12 h-12" />
          </div>
          <p className="text-sm text-muted-foreground font-semibold">System Status</p>
          <p className="text-3xl font-black mt-1 text-emerald-500">Active</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tenants by name or subdomain..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-[11px] font-black uppercase tracking-widest border-b border-border">
                <th className="px-6 py-4">Tenant Information</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-8 h-16 bg-muted/10"></td>
                  </tr>
                ))
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                    No tenants found matching your search.
                  </td>
                </tr>
              ) : filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tenant.tenant_type === 'EDUCATION' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                        {tenant.tenant_type === 'EDUCATION' ? <Sparkles className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">{tenant.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${tenant.tenant_type === 'EDUCATION' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-emerald-500/10 text-emerald-600'
                            }`}>
                            {tenant.tenant_type}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">{tenant.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingTenant(tenant)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTenant(tenant.id)}
                        className="p-2 hover:bg-danger/10 rounded-lg text-muted-foreground hover:text-danger transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md border border-border shadow-2xl rounded-3xl p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black mb-6">Edit Tenant</h2>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Tenant Name</label>
                <input
                  autoFocus
                  required
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  className="w-full bg-muted/40 border-2 border-transparent focus:border-primary/20 focus:bg-card px-4 py-3 rounded-2xl outline-none transition-all font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Organization Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTenant({ ...editingTenant, tenant_type: 'EDUCATION' })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${editingTenant.tenant_type === 'EDUCATION' ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    Education
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTenant({ ...editingTenant, tenant_type: 'COMPANY' })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${editingTenant.tenant_type === 'COMPANY' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    Company
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="flex-1 py-4 bg-muted hover:bg-muted/80 rounded-2xl font-black transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isUpdating}
                  type="submit"
                  className="flex-1 py-4 bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 rounded-2xl font-black transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
