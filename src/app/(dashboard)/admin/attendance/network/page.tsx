'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Globe, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface NetworkPolicy {
  id: string;
  ip_address_or_range: string;
  label: string;
  is_active: boolean;
}

export default function NetworkPoliciesPage() {
  const [policies, setPolicies] = useState<NetworkPolicy[]>([]);
  const [settings, setSettings] = useState<{ enable_ip_validation?: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ ip: '', label: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/admin/attendance/network'),
        fetch('/api/admin/attendance/settings')
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      
      if (pData.success) setPolicies(pData.data);
      if (sData.success) setSettings(sData.settings);
    } catch (err) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleValidation = async () => {
    setSaving(true);
    try {
      const newValue = !settings.enable_ip_validation;
      const res = await fetch('/api/admin/attendance/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_ip_validation: newValue })
      });
      if (res.ok) setSettings({ ...settings, enable_ip_validation: newValue });
    } finally {
      setSaving(false);
    }
  };

  const addPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.ip) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/attendance/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address_or_range: newPolicy.ip,
          label: newPolicy.label,
          is_active: true
        })
      });
      if (res.ok) {
        setNewPolicy({ ip: '', label: '' });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await fetch(`/api/admin/attendance/network/${id}`, { method: 'DELETE' });
      setPolicies(policies.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary-400" />
            Network Security Policies
          </h1>
          <p className="text-white/50 mt-1">Restrict attendance marking to approved network locations.</p>
        </div>

        <div className="flex items-center gap-4 glass p-2 rounded-2xl border border-white/10">
          <span className="text-sm font-medium text-white/70 px-2">IP Validation</span>
          <button
            onClick={toggleValidation}
            disabled={saving}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none 
              ${settings.enable_ip_validation ? 'bg-primary-500' : 'bg-white/10'}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform
                ${settings.enable_ip_validation ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Policy List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-3xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-semibold text-white">Active Policies</h2>
              <span className="text-xs text-primary-400 font-medium px-2 py-1 bg-primary-500/10 rounded-lg">
                {policies.length} Total
              </span>
            </div>
            
            <div className="divide-y divide-white/5">
              {policies.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Globe className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 italic">No network policies defined. Any IP can mark attendance if validation is disabled.</p>
                </div>
              ) : (
                policies.map((policy) => (
                  <div key={policy.id} className="px-6 py-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${policy.is_active ? 'bg-success-500/10 text-success-400' : 'bg-white/5 text-white/20'}`}
                      >
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-mono text-white/90">{policy.ip_address_or_range}</p>
                        <p className="text-xs text-white/40">{policy.label || 'University Subnet'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {policy.is_active ? (
                        <CheckCircle2 className="w-4 h-4 text-success-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-white/20" />
                      )}
                      <button 
                        onClick={() => deletePolicy(policy.id)}
                        className="p-2 text-white/30 hover:text-danger-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Policy Form */}
        <div className="space-y-4">
          <div className="glass rounded-3xl border border-white/10 p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary-400" />
              Add New Rule
            </h2>
            <form onSubmit={addPolicy} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase mb-2 block tracking-wider">IP or Range (CIDR)</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.0/24"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-mono text-sm"
                  value={newPolicy.ip}
                  onChange={(e) => setNewPolicy({ ...newPolicy, ip: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase mb-2 block tracking-wider">Location Label</label>
                <input
                  type="text"
                  placeholder="e.g. Main Campus Library"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm"
                  value={newPolicy.label}
                  onChange={(e) => setNewPolicy({ ...newPolicy, label: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full gradient-primary text-white font-bold py-3 rounded-2xl shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Policy
              </button>
            </form>
            
            <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-widest font-bold mb-2">Security Note</p>
              <p className="text-xs text-white/40 leading-relaxed">
                Rules take effect immediately. Ensure your current network is allowed before enabling validation to avoid locking yourself out.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
