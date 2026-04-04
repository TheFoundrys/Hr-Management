'use client';

import { useState, useEffect } from 'react';
import { 
  Fingerprint, Send, Loader2, CheckCircle, AlertCircle, 
  RefreshCw, Users, Shield, ShieldOff, Activity, Clock, Globe, Trash2, Plus, ChevronRight
} from 'lucide-react';

interface DeviceUser {
  uid: number;
  userId: string;
  name: string;
  role: number;
  isActive?: boolean;
}

export default function BiometricPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [users, setUsers] = useState<DeviceUser[]>([]);
  const [activeTab, setActiveTab] = useState<'devices' | 'users' | 'settings' | 'debug'>('devices');
  const [attendanceSettings, setAttendanceSettings] = useState<{ attendance_mode?: string }>({});
  const [pendingMode, setPendingMode] = useState<string>('WEB_UI');
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [newDevice, setNewDevice] = useState({ id: '', name: '', ip: '', location: '' });
  const [addingDevice, setAddingDevice] = useState(false);
  const [rawData, setRawData] = useState('USERID=1\tCHECKTIME=2026-03-31 09:12:00\tSTATUS=0');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchData();
    fetchSettings();
    fetchDevices();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/attendance/settings');
      const data = await res.json();
      if (data.success) {
        setAttendanceSettings(data.settings);
        setPendingMode(data.settings.attendance_mode || 'WEB_UI');
      }
    } catch (err) { console.error(err); }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/admin/devices');
      const data = await res.json();
      if (data.success) setDevices(data.devices);
    } catch (err) { console.error(err); }
  };

  const applyAttendanceMode = async () => {
    setUpdatingSettings(true);
    try {
      const res = await fetch('/api/admin/attendance/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_mode: pendingMode })
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceSettings(data.settings);
        alert('Mode updated.');
      }
    } catch (err) { alert('Update failed.'); } finally { setUpdatingSettings(false); }
  };

  const addDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingDevice(true);
    try {
      const res = await fetch('/api/admin/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: newDevice.ip,
          device_name: newDevice.name,
          device_ip: newDevice.ip,
          location: newDevice.location
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewDevice({ id: '', name: '', ip: '', location: '' });
        fetchDevices();
      }
    } finally { setAddingDevice(false); }
  };

  const removeDevice = async (id: string) => {
    if (!confirm('Remove device?')) return;
    try {
      await fetch(`/api/admin/devices?id=${id}`, { method: 'DELETE' });
      fetchDevices();
    } catch (err) { alert('Failed.'); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const userRes = await fetch('/api/biometric/users');
      const userData = await userRes.json();
      if (userData.success) setUsers(userData.users);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const sendPush = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/biometric/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'x-biometric-key': 'biometric-device-secret-key',
        },
        body: rawData,
      });
      const data = await res.json();
      setResult({ success: res.ok, message: data.message || data.error || 'Done' });
    } catch (err) { setResult({ success: false, message: 'Network error' }); } finally { setSending(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-indigo-500" />
            Biometric Management
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium uppercase tracking-wider">Institutional hardware & access protocols</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all shadow-sm flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Process Global Logs
          </button>
        </div>
      </header>

      <div className="flex items-center gap-8 border-b border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
        {[
          { id: 'devices', label: 'Registered Units' },
          { id: 'settings', label: 'Attendance Mode' },
          { id: 'users', label: 'Access Control' },
          { id: 'debug', label: 'Dev Console' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative
              ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'devices' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Operational Fleet</h2>
              </div>
              <div className="divide-y divide-slate-800">
                {devices.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 italic text-sm">No hardware units registered yet.</div>
                ) : (
                  devices.map(device => (
                    <div key={device.id} className="p-6 flex items-center justify-between hover:bg-slate-900/40 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-indigo-500 border border-slate-800">
                          <Globe size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-100">{device.device_name || 'Generic Device'}</p>
                          <p className="text-xs font-mono text-slate-500">{device.device_ip}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400 font-bold uppercase tracking-widest">
                          {device.location || 'Entrance'}
                        </span>
                        <button onClick={() => removeDevice(device.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-900/40 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Hardware ID</th>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => (
                    <tr key={u.userId} className="hover:bg-slate-900/40 transition-all group">
                      <td className="px-6 py-4 font-mono text-indigo-400 text-sm font-bold">{u.userId}</td>
                      <td className="px-6 py-4 font-bold text-slate-200">{u.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-indigo-500 shadow-lg' : 'bg-red-500'}`} />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                            {u.isActive !== false ? 'Authorized' : 'Suspended'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-all opacity-0 group-hover:opacity-100">
                          <Shield size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 space-y-8">
               <div className="space-y-2">
                 <h2 className="text-lg font-bold text-slate-100">Attendance Protocol</h2>
                 <p className="text-sm text-slate-500">Define the primary authentication method for the institution.</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { id: 'WEB_UI', label: 'Web Platform', icon: Globe },
                   { id: 'BIOMETRIC', label: 'Hard Biometrics', icon: Fingerprint },
                   { id: 'BOTH', label: 'Hybrid Protocol', icon: Activity }
                 ].map(m => (
                   <button 
                    key={m.id}
                    onClick={() => setPendingMode(m.id)}
                    className={`p-6 border rounded-xl text-left transition-all space-y-4
                      ${pendingMode === m.id ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}
                   >
                     <m.icon className={pendingMode === m.id ? 'text-indigo-400' : 'text-slate-500'} size={24} />
                     <div>
                       <p className={`font-bold text-sm ${pendingMode === m.id ? 'text-indigo-400' : 'text-slate-300'}`}>{m.label}</p>
                       <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">Standard Layer</p>
                     </div>
                   </button>
                 ))}
               </div>
               <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                 <div className="flex items-center gap-3 text-sm text-slate-500">
                    <AlertCircle size={16} />
                    <span>Affects all units immediately.</span>
                 </div>
                 <button onClick={applyAttendanceMode} className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all">
                   Save Policy
                 </button>
               </div>
             </div>
          )}

          {activeTab === 'debug' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">ADMS Data Stream</h2>
              <textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-400 min-h-[200px] outline-none"
              />
              <button onClick={sendPush} className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest">
                Force Propagate
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
             <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800 pb-4">Onboard Unit</h3>
             <form onSubmit={addDevice} className="space-y-4">
                <input 
                  placeholder="IP / Serial Number"
                  value={newDevice.ip}
                  onChange={e => setNewDevice({...newDevice, ip: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-800 px-4 py-3 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 outline-none"
                />
                <input 
                  placeholder="Device Name"
                  value={newDevice.name}
                  onChange={e => setNewDevice({...newDevice, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-800 px-4 py-3 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 outline-none"
                />
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <Plus size={14} /> Register
                </button>
             </form>
          </div>

          <div className="bg-indigo-600/5 border border-indigo-600/20 rounded-xl p-6 space-y-3">
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Security Note</p>
             <p className="text-xs text-slate-500 leading-relaxed font-medium">Use the developer console to simulate biometric events if hardware is behind a restrictive firewall.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
