'use client';
import { useEffect, useState } from 'react';
import { Clock, Filter, Loader2, Fingerprint } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR'].includes(user?.role?.toUpperCase() || '');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const url = `/api/attendance?date=${date}${status ? `&status=${status}` : ''}${!isAdmin && user ? `&employeeId=${user.employeeId}` : ''}`;
      const [attRes, setRes] = await Promise.all([fetch(url), fetch('/api/admin/attendance/settings')]);
      const [attData, setData] = await Promise.all([attRes.json(), setRes.json()]);
      if (attData.success) setRecords(attData.attendance);
      if (setData.success) setMode(setData.settings.attendance_mode);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchRecords();
    
    // Auto-refresh every 5 seconds for live hours if viewing today
    const isToday = date === new Date().toISOString().split('T')[0];
    if (isToday) {
      const interval = setInterval(fetchRecords, 5000);
      return () => clearInterval(interval);
    }
  }, [date, status, user]);

  const clock = async () => {
    if (!user) return;
    const res = await fetch('/api/attendance/ingest', {
      method: 'POST', body: JSON.stringify({ sourceType: 'web', employeeId: user.employeeId, tenantId: user.tenantId })
    });
    if ((await res.json()).success) fetchRecords();
  };

  const [processing, setProcessing] = useState(false);

  const processBiometric = async () => {
    try {
      setProcessing(true);
      const res = await fetch('/api/attendance/process', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchRecords();
      } else {
        alert(`Processing Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error during processing');
    } finally {
      setProcessing(false);
    }
  };

  const fmt = (t: string) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const hasIn = records.some(r => r.checkIn);
  const hasOut = records.some(r => r.checkOut);

  return (
    <div className="max-w-auto space-y-6 animate-fade-in">
      <header className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Clock className="text-primary" /> Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">{records.length} records • {new Date(date).toDateString()}</p>
        </div>

        {isAdmin ? (
          <div className="flex gap-3">
            <a href="/attendance/terminal" className="px-5 py-2 bg-muted hover:bg-muted text-foreground border border-border rounded-xl text-sm font-bold transition-all shadow-soft">Scanner Terminal</a>
            <button 
              onClick={processBiometric} 
              disabled={processing}
              className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-soft shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> 
                  Processing...
                </div>
              ) : 'Process Logs'}
            </button>
          </div>
        ) : (
          date === new Date().toISOString().split('T')[0] && (
            mode === 'BIOMETRIC' ? (
              <div className="px-5 py-2.5 bg-amber-500/10 text-amber-600 rounded-xl flex gap-2 text-sm font-bold border border-amber-500/20"><Fingerprint size={18} /> Biometric Restricted</div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => clock()} disabled={hasIn || loading} className="px-6 py-2 bg-primary disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-xl text-sm font-bold transition-all shadow-soft shadow-primary/20">Clock In</button>
                <button onClick={() => clock()} disabled={!hasIn || hasOut || loading} className="px-6 py-2 bg-muted border border-border disabled:text-muted-foreground text-foreground rounded-xl text-sm font-bold transition-all">Clock Out</button>
              </div>
            )
          )
        )}
      </header>

      <div className="flex gap-4 p-5 bg-card border border-border rounded-2xl items-center shadow-soft">
        <Filter className="text-muted-foreground" size={18} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-muted border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:border-primary outline-none transition-all" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-muted border border-border rounded-xl px-4 py-2 text-sm text-foreground capitalize focus:border-primary outline-none transition-all cursor-pointer">
          <option value="">All Statuses</option>
          {['present', 'absent', 'late', 'half-day', 'on-leave'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Present', id: 'PRESENT' },
          { label: 'Absent', id: 'ABSENT' },
          { label: 'Late', id: 'LATE' },
          { label: 'Half-Day', id: 'HALF_DAY' },
          { label: 'On-Leave', id: 'ON_LEAVE' }
        ].map((s) => (
          <div key={s.id} className="bg-card border border-border rounded-2xl p-5 text-center shadow-soft">
            <p className="text-3xl font-black text-foreground">
              {records.filter((r) => r.status?.toUpperCase() === s.id).length}
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div> :
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted border-b border-border text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                <tr>{['ID', 'Hardware ID', 'Name', 'Check In', 'Out', 'Hours', 'Status', 'Source'].map(h => <th key={h} className="p-5">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.length ? records.map(r => (
                  <tr key={r.id || r.employeeId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-5 font-mono text-primary text-xs font-bold">{r.employeeId}</td>
                    <td className="p-5 font-mono text-muted-foreground text-xs">{r.deviceUserId}</td>
                    <td className="p-5 font-bold">{r.firstName} {r.lastName}</td>
                    <td className="p-5 font-bold">{fmt(r.checkIn)}</td>
                    <td className="p-5 text-muted-foreground">{fmt(r.checkOut)}</td>
                    <td className="p-5 text-muted-foreground"><span className="bg-muted px-2 py-1 rounded-md text-[10px] font-bold border border-border">{Number(r.workingHours || 0).toFixed(1)}h</span></td>
                    <td className="p-5"><span className="bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg">{r.status}</span></td>
                    <td className="p-5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{r.source}</td>
                  </tr>
                )) : <tr><td colSpan={8} className="p-12 text-center text-muted-foreground italic">No attendance records documented for this date.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  );
}