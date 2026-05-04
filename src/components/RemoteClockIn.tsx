'use client';

import { useState, useEffect } from 'react';
import { MousePointer2, Loader2, CheckCircle2, Clock } from 'lucide-react';

export function RemoteClockIn() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/attendance/remote');
      const data = await res.json();
      if (data.success) setStatus(data.attendance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type: 'in' | 'out') => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance/remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, metadata: { ua: navigator.userAgent } })
      });
      const data = await res.json();
      if (data.success) {
        await fetchStatus();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="h-10 flex items-center justify-center"><Loader2 className="animate-spin" size={16} /></div>;

  const sessions = status?.remote_metadata?.sessions || [];
  const isRemoteActive = Array.isArray(sessions) && sessions.some((s: { out?: string }) => s && !s.out);
  const isDayCompleted = status?.check_out && !isRemoteActive;

  return (
    <div className="space-y-3">
      {isDayCompleted && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
           <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Shift Closed (LIFO: {new Date(status.check_out).toLocaleTimeString()})</p>
        </div>
      )}
      
      <button 
        disabled={actionLoading}
        onClick={() => handleAction(isRemoteActive ? 'out' : 'in')}
        className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
          isRemoteActive 
            ? 'bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600' 
            : 'bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02]'
        }`}
      >
        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <MousePointer2 size={12} />}
        {isRemoteActive ? 'Remote Clock-Out' : 'Remote Clock-In'}
      </button>
    </div>
  );
}
