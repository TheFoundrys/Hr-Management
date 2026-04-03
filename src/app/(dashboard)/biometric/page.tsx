'use client';

import { useState, useEffect } from 'react';
import { 
  Fingerprint, Send, Loader2, CheckCircle, AlertCircle, 
  RefreshCw, Users, Shield, ShieldOff, Activity, Clock
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
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'debug'>('users');
  
  // Debug state
  const [rawData, setRawData] = useState('USERID=1\tCHECKTIME=2026-03-31 09:12:00\tSTATUS=0');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, infoRes] = await Promise.all([
        fetch('/api/biometric/users'),
        fetch('/api/biometric/test')
      ]);
      const userData = await userRes.json();
      const infoData = await infoRes.json();
      
      if (userData.success) setUsers(userData.users);
      if (infoData.success) setDeviceInfo(infoData.info);
    } catch (err) {
      console.error('Failed to fetch biometric data');
    } finally {
      setLoading(false);
    }
  };

  const syncFromIp = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/biometric/sync', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Sync triggered successfully');
      fetchData();
    } catch (err) {
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/biometric/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceUserId: userId, enabled: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.userId === userId ? { ...u, isActive: !currentStatus } : u));
      }
    } catch (err) {
      alert('Failed to update user status');
    }
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
      if (res.ok) fetchData();
    } catch (err) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Fingerprint className="w-7 h-7 text-primary-400" /> Biometric Management
          </h1>
          <p className="text-white/40 text-sm mt-1">Manage ZKTeco devices and user access</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="p-2.5 glass-card rounded-xl text-white/60 hover:text-white transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={syncFromIp}
            disabled={syncing}
            className="gradient-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            {syncing ? 'Syncing...' : 'Force Sync'}
          </button>
        </div>
      </div>

      {/* Device Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Device Users</p>
              <p className="text-xl font-bold text-white">{deviceInfo?.userCounts || 0}</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Log Capacity</p>
              <p className="text-xl font-bold text-white">
                {deviceInfo?.logCounts || 0} / {deviceInfo?.logCapacity || 10000}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${deviceInfo ? 'bg-accent-500/10 text-accent-400' : 'bg-danger-500/10 text-danger-400'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Connection</p>
              <p className="text-xl font-bold text-white">{deviceInfo ? 'Online' : 'Offline'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/10">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'users' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-white/40 hover:text-white/60'}`}
        >
          Device Users
        </button>
        <button 
          onClick={() => setActiveTab('debug')}
          className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'debug' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-white/40 hover:text-white/60'}`}
        >
          ADMS Debugger
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="glass-card rounded-2xl overflow-hidden animate-slide-up">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 uppercase tracking-wider">
                <th className="px-6 py-4 text-left text-xs font-bold text-white/40">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white/40">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white/40">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white/40">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4 h-16 bg-white/5"></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-white/20">No users found on device</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.userId} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-sm font-mono text-primary-400">{user.userId}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{user.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 bg-white/10 rounded-lg text-white/60">
                        {user.role === 14 ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.isActive !== false ? 'bg-accent-500' : 'bg-danger-500'}`} />
                        <span className="text-xs text-white/60">{user.isActive !== false ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleUserStatus(user.userId, user.isActive !== false)}
                        className={`p-2 rounded-xl transition-all ${user.isActive !== false ? 'text-danger-400 bg-danger-400/10 hover:bg-danger-400/20' : 'text-accent-400 bg-accent-400/10 hover:bg-accent-400/20'}`}
                        title={user.isActive !== false ? 'Disable Access' : 'Enable Access'}
                      >
                        {user.isActive !== false ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'debug' && (
        <div className="space-y-6 animate-slide-up">
           <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-white/70 mb-3">Simulate ADMS Push</h2>
            <textarea
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm resize-none focus:border-primary-500 transition-all"
            />
            <div className="mt-4 flex items-center gap-4">
              <button 
                onClick={sendPush} 
                disabled={sending} 
                className="gradient-primary px-6 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending...' : 'Transmit Data'}
              </button>
              {result && (
                <div className={`flex items-center gap-2 text-sm ${result.success ? 'text-accent-400' : 'text-danger-500'}`}>
                  {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {result.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
