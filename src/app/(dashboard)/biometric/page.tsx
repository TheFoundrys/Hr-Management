'use client';
import { useState, useEffect } from 'react';
import { Fingerprint, RefreshCw, Activity, Globe, Trash2, Plus, Shield, ShieldOff, AlertCircle } from 'lucide-react';

export default function BiometricPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [tab, setTab] = useState<'devices' | 'users' | 'settings' | 'debug'>('devices');
  const [mode, setMode] = useState('WEB_UI');
  const [newDev, setNewDev] = useState({ name: '', ip: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState('USERID=1\tCHECKTIME=2026-03-31 09:12:00\tSTATUS=0');

  const fetchInit = async () => {
    setLoading(true);
    setError(null);
    
    const api = async (url: string) => {
      const r = await fetch(url);
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`HTTP ${r.status}: ${text.substring(0, 50)}`);
      }
      return r.json();
    };
    
    try {
      // 1. Fetch devices first
      const d = await api('/api/admin/devices').catch(() => ({ success: true, devices: [] }));
      if (d.success) setDevices(d.devices || []);

      // 2. Fetch users for the first device if available
      const firstDeviceIp = d.devices?.[0]?.device_ip;
      if (firstDeviceIp) {
        const u = await api(`/api/biometric/users?ip=${firstDeviceIp}`).catch(e => ({ success: false, error: e.message, users: [] }));
        if (u.success) setUsers(u.users || []);
        else setError(u.error);
      } else {
        setUsers([]); // No devices, no users
      }

      // 3. Fetch settings
      const s = await api('/api/admin/attendance/settings').catch(() => ({ success: false }));
      if (s.success && s.settings) setMode(s.settings.attendance_mode || 'WEB_UI');

    } catch (e: any) {
      setError(e.message);
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchInit();
  }, []);

  const saveMode = async () => {
    const res = await fetch('/api/admin/attendance/settings', { method: 'PATCH', body: JSON.stringify({ attendance_mode: mode }) });
    if ((await res.json()).success) alert('Policy Updated');
  };

  const addDev = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/admin/devices', { method: 'POST', body: JSON.stringify({ device_id: newDev.ip, device_name: newDev.name, device_ip: newDev.ip }) });
    if ((await res.json()).success) { setNewDev({ name: '', ip: '' }); fetchInit(); }
  };

  const pushLog = async () => {
    const res = await fetch('/api/biometric/push', { method: 'POST', headers: { 'x-biometric-key': 'biometric-device-secret-key' }, body: rawData });
    alert((await res.json()).message || 'Sent');
  };

  const handleProcess = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/process', { 
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchInit();
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      alert(`Processing failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-auto space-y-8 animate-fade-in">
      <header className="flex justify-between items-center pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3"><Fingerprint className="text-primary" /> Biometrics</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1 uppercase tracking-widest leading-none">Global Hardware Integration</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchInit} className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground"><RefreshCw className={loading ? 'animate-spin' : ''} size={18} /></button>
          <button onClick={handleProcess} disabled={loading} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 shadow-soft transition-colors disabled:opacity-50">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity size={16} />} 
            Process Logs
          </button>
        </div>
      </header>

      <div className="flex border-b border-border gap-8 overflow-x-auto pb-px">
        {['devices', 'settings', 'users', 'debug'].map(id => (
          <button key={id} onClick={() => setTab(id as any)} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {id} {tab === id && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 p-4 rounded-xl flex items-center gap-3 text-danger text-xs font-bold uppercase tracking-wider animate-in fade-in duration-300">
          <AlertCircle size={18} />
          <span>Communication Error: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {tab === 'devices' && (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
              {devices.length ? devices.map(d => (
                <div key={d.id} className="p-6 flex justify-between items-center hover:bg-muted/30 group">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-primary border border-border"><Globe size={18} /></div>
                    <div><p className="font-bold text-foreground text-sm">{d.device_name || 'Generic'}</p><p className="text-xs font-mono text-muted-foreground">{d.device_ip}</p></div>
                  </div>
                  <button onClick={() => fetch(`/api/admin/devices?id=${d.id}`, { method: 'DELETE' }).then(fetchInit)} className="text-muted-foreground hover:text-danger opacity-0 group-hover:opacity-100 p-2 transition-all"><Trash2 size={16} /></button>
                </div>
              )) : <div className="p-16 text-center text-muted-foreground italic text-sm">Offline. No hardware active.</div>}
            </div>
          )}

          {tab === 'users' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                    <tr><th className="p-5">HW ID</th><th className="p-5">Name</th><th className="p-5">Status</th><th className="p-5 text-right">Access</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map(u => (
                      <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-5 font-mono text-primary text-xs font-bold">{u.userId}</td>
                        <td className="p-5 font-bold">{u.name}</td>
                        <td className="p-5"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-danger'}`} /><span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider font-mono">{u.isActive !== false ? 'Authorized' : 'Blacklisted'}</span></div></td>
                        <td className="p-5 text-right"><Shield className="inline text-muted-foreground hover:text-primary cursor-pointer" size={16} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="bg-card border border-border rounded-2xl p-8 space-y-8 shadow-soft">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[{ id: 'WEB_UI', l: 'Web UI', icon: Globe }, { id: 'BIOMETRIC', l: 'Device', icon: Fingerprint }, { id: 'BOTH', l: 'Hybrid', icon: Activity }].map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)} className={`p-6 border rounded-2xl text-left transition-all ${mode === m.id ? 'bg-primary/5 border-primary/50' : 'bg-muted border-border hover:border-primary/20 grayscale grayscale-100'}`}>
                    <m.icon className={mode === m.id ? 'text-primary' : 'text-muted-foreground'} size={24} />
                    <p className={`font-black text-sm uppercase tracking-wider mt-4 ${mode === m.id ? 'text-primary' : 'text-muted-foreground'}`}>{m.l}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground flex gap-2 items-center"><AlertCircle size={14} /> Policies push global auth updates across the network.</p>
                <button onClick={saveMode} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-soft shadow-primary/20">Apply Policy</button>
              </div>
            </div>
          )}

          {tab === 'debug' && (
            <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-soft">
              <textarea value={rawData} onChange={e => setRawData(e.target.value)} className="w-full bg-muted border border-border rounded-2xl p-6 font-mono text-[11px] text-primary h-48 outline-none focus:border-primary transition-all shadow-inner" />
              <button onClick={pushLog} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-soft shadow-primary/20">Mock ADMS Push</button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-soft">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-4">Register Hardware</h3>
            <form onSubmit={addDev} className="space-y-4">
              <input placeholder="IP (192.168.x.x)" required value={newDev.ip} onChange={e => setNewDev({ ...newDev, ip: e.target.value })} className="w-full bg-muted border border-border p-4 rounded-xl text-sm text-foreground focus:border-primary outline-none transition-all" />
              <input placeholder="Friendly Name" required value={newDev.name} onChange={e => setNewDev({ ...newDev, name: e.target.value })} className="w-full bg-muted border border-border p-4 rounded-xl text-sm text-foreground focus:border-primary outline-none transition-all" />
              <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-primary/90 shadow-soft shadow-primary/20 transition-all"><Plus size={16} /> Register</button>
            </form>
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-3"><p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">Security Info</p><p className="text-[10px] text-muted-foreground leading-relaxed font-bold">Standard ADMS push protocols are enforced for real-time hardware communication.</p></div>
        </div>
      </div>
    </div>
  );
}
