'use client';
import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Globe, Loader2 } from 'lucide-react';

export default function NetworkPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ip: '', label: '' });

  const fetchInit = () => {
    setLoading(true);
    const api = (url: string) => fetch(url).then(r => r.json());
    Promise.all([api('/api/admin/attendance/network'), api('/api/admin/attendance/settings')])
      .then(([p, s]) => { if (p.success) setPolicies(p.data); if (s.success) setSettings(s.settings); })
      .finally(() => setLoading(false));
  };
  useEffect(fetchInit, []);

  const toggle = async () => {
    const val = !settings.enable_ip_validation;
    const res = await fetch('/api/admin/attendance/settings', { method: 'PATCH', body: JSON.stringify({ enable_ip_validation: val }) });
    if (res.ok) setSettings({ ...settings, enable_ip_validation: val });
  };

  const add = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/admin/attendance/network', { method: 'POST', body: JSON.stringify({ ip_address_or_range: form.ip, label: form.label, is_active: true }) });
    if (res.ok) { setForm({ ip: '', label: '' }); fetchInit(); }
  };

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

  return (
    <div className="max-w-auto space-y-8 animate-fade-in">
      <header className="flex justify-between items-center pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3"><Shield className="text-primary" /> Network Security</h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 leading-none">Access Restriction Protocols</p>
        </div>
        <button onClick={toggle} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.enable_ip_validation ? 'bg-primary text-primary-foreground shadow-soft shadow-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
          IP Validation: {settings.enable_ip_validation ? 'Active' : 'Disabled'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft divide-y divide-border">
            {policies.length ? policies.map(p => (
              <div key={p.id} className="p-6 flex justify-between items-center hover:bg-muted/30 group">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-primary border border-border shadow-inner"><Shield size={18} /></div>
                  <div><p className="font-mono text-foreground text-sm font-black">{p.ip_address_or_range}</p><p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{p.label || 'Default Subnet'}</p></div>
                </div>
                <button onClick={() => fetch(`/api/admin/attendance/network/${p.id}`, { method: 'DELETE' }).then(fetchInit)} className="text-muted-foreground hover:text-danger opacity-0 group-hover:opacity-100 p-2 transition-all"><Trash2 size={16} /></button>
              </div>
            )) : (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground/30"><Globe size={32} /></div>
                 <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Open Network Configuration</p>
                 <p className="text-xs text-muted-foreground/60 mt-2 font-medium">All IP ranges currently permitted. Onboard a policy to restrict access.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 h-fit space-y-6 shadow-soft">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-4">New Access Rule</h3>
          <form onSubmit={add} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Terminal IP / CIDR</label>
              <input placeholder="192.168.1.0/24" required value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} className="w-full bg-muted border border-border p-4 rounded-xl text-sm text-foreground focus:border-primary outline-none font-mono transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Protocol Identifier</label>
              <input placeholder="e.g. Campus Wi-Fi" required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="w-full bg-muted border border-border p-4 rounded-xl text-sm text-foreground focus:border-primary outline-none transition-all" />
            </div>
            <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-primary/90 shadow-soft shadow-primary/20 transition-all"><Plus size={16} /> Deploy Policy</button>
          </form>
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5"><p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Subnet Guard</p><p className="text-[10px] text-muted-foreground leading-relaxed font-bold">Policy changes are propagated immediately across the entire university network node.</p></div>
        </div>
      </div>
    </div>
  );
}
