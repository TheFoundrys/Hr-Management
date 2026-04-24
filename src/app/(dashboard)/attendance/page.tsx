'use client';
import { useEffect, useState } from 'react';
import { Clock, Filter, Calendar, LogIn, LogOut, Timer, User, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { hasPermission } from '@/lib/auth/rbac';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const isAdmin = hasPermission(user?.role || '', 'MANAGE_ATTENDANCE');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('');

  const fetchRecords = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const queryParams = new URLSearchParams();
      if (isAdmin) {
        queryParams.append('date', date);
      } else {
        const now = new Date();
        queryParams.append('month', (now.getMonth() + 1).toString());
        queryParams.append('year', now.getFullYear().toString());
        queryParams.append('employeeId', user?.employeeId || '');
      }
      if (status) queryParams.append('status', status);

      const [attRes, setRes] = await Promise.all([
        fetch(`/api/attendance?${queryParams.toString()}`),
        fetch('/api/admin/attendance/settings')
      ]);
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
    const isToday = date === new Date().toISOString().split('T')[0];
    if (isToday) {
      const interval = setInterval(() => fetchRecords(true), 5000);
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

  const fmt = (t: string) => t ? new Date(t).toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' 
  }) : '—';

  return (
    <div className="max-w-6xl mx-auto py-6 px-6 space-y-6 animate-in fade-in duration-500">
      {/* Clean Header */}
      <header className="flex items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Clock size={28} className="text-primary" /> Attendance
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2 pl-1">
            {new Date(date).toLocaleDateString('en-IN', { dateStyle: 'full' })}
          </p>
        </div>

        <div className="flex gap-3">
          {!isAdmin && date === new Date().toISOString().split('T')[0] && mode !== 'BIOMETRIC' && (
            <button onClick={clock} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/10">
              Clock In/Out
            </button>
          )}
        </div>
      </header>

      {/* Structured Stat Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present', id: 'PRESENT', color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' },
          { label: 'Late', id: 'LATE', color: 'text-amber-500 bg-amber-500/5 border-amber-500/10' },
          { label: 'Absent', id: 'ABSENT', color: 'text-rose-500 bg-rose-500/5 border-rose-500/10' },
          { label: 'On Leave', id: 'ON_LEAVE', color: 'text-primary bg-primary/5 border-primary/10' }
        ].map(s => (
          <div key={s.id} className={`px-5 py-4 rounded-2xl border flex flex-col gap-1 ${s.color}`}>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{s.label}</span>
            <span className="text-2xl font-black">{records.filter(r => r.status?.toUpperCase() === s.id).length}</span>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-6 bg-muted/30 p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-2 text-muted-foreground ml-2">
          <Filter size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Filter By</span>
        </div>
        <div className="flex gap-6">
          {isAdmin && (
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-xs font-bold uppercase tracking-widest outline-none border-b-2 border-border focus:border-primary pb-1 text-foreground" />
          )}
          <select value={status} onChange={e => setStatus(e.target.value)} className="bg-transparent text-xs font-bold uppercase tracking-widest outline-none border-b-2 border-border focus:border-primary pb-1 cursor-pointer text-foreground">
            <option value="" className="bg-card">All Statuses</option>
            {['Present', 'Absent', 'Late'].map(s => <option key={s} value={s.toLowerCase()} className="bg-card">{s}</option>)}
          </select>
        </div>
      </div>

      {/* Enhanced Simple Row Table */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {records.length ? records.map(r => (
            <div key={r.id || r.employeeId} className="flex flex-col sm:flex-row items-center justify-between p-3 hover:bg-muted/30 transition-colors group gap-6 sm:gap-0">
              <div className="flex items-center gap-8 flex-1 w-full">
                {/* Date/Weekday */}
                <div className="w-12 text-center shrink-0">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                  <p className="text-2xl font-black text-foreground mt-1.5 tracking-tighter">{new Date(r.date).getDate()}</p>
                </div>

                <div className="h-10 w-[1px] bg-border hidden sm:block" />

                {/* Info Grid */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-8 items-center w-full">
                  <div className="flex items-center gap-4 col-span-2 lg:col-span-1">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-xs font-black text-muted-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {isAdmin ? (r.firstName?.[0] || 'U') : <User size={20} />}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-black text-foreground tracking-tight truncate">{isAdmin ? `${r.firstName} ${r.lastName}` : 'Standard Shift Log'}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] mt-0.5">{r.employeeId || 'SYS-ID'}</p>
                    </div>
                  </div>

                  <div className="hidden lg:block">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Check In</p>
                    <p className="text-xs font-bold text-foreground">{fmt(r.checkIn)}</p>
                  </div>

                  <div className="hidden lg:block">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Check Out</p>
                    <p className="text-xs font-bold text-foreground">{fmt(r.checkOut)}</p>
                  </div>

                  <div className="flex items-center gap-6 justify-between lg:justify-start">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border">
                      <Timer size={14} className="text-primary" />
                      <span className="text-[11px] font-black text-foreground">{Number(r.workingHours || 0).toFixed(1)}h</span>
                    </div>
                    <div className="lg:hidden">
                       <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${
                        r.status?.toLowerCase() === 'present' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 
                        r.status?.toLowerCase() === 'late' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-6 pl-6">
                <span className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border transition-all ${
                  r.status?.toLowerCase() === 'present' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500' : 
                  r.status?.toLowerCase() === 'late' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-50 group-hover:text-amber-600 group-hover:border-amber-600' : 'text-rose-500 bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500'
                }`}>
                  {r.status}
                </span>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          )) : (
            <div className="py-24 text-center">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Institutional Records Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}