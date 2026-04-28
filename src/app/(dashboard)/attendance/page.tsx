'use client';

import { useEffect, useState } from 'react';
import { 
  Clock, 
  Filter, 
  Calendar, 
  LogIn, 
  LogOut, 
  Timer, 
  User, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarDays
} from 'lucide-react';
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
      method: 'POST', 
      body: JSON.stringify({ 
        sourceType: 'web', 
        employeeId: user.employeeId, 
        tenantId: user.tenantId 
      })
    });
    const data = await res.json();
    if (data.success) fetchRecords();
  };

  const fmt = (t: string) => t ? new Date(t).toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' 
  }) : '—';

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    const styles = {
      PRESENT: 'bg-green-50 text-green-700 border-green-100',
      LATE: 'bg-amber-50 text-amber-700 border-amber-100',
      ABSENT: 'bg-red-50 text-red-700 border-red-100',
      ON_LEAVE: 'bg-blue-50 text-blue-700 border-blue-100',
    }[s] || 'bg-slate-50 text-slate-700 border-slate-100';

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles}`}>
        {s === 'PRESENT' ? 'Ontime' : s?.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="w-full py-8 px-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? 'Monitor team attendance' : 'View your attendance logs and stats'}
            <span className="mx-2">•</span>
            {new Date(date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        {!isAdmin && date === new Date().toISOString().split('T')[0] && mode !== 'BIOMETRIC' && (
          <button 
            onClick={clock}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm active:scale-95"
          >
            <Clock size={18} />
            Clock In/Out
          </button>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Present</p>
            <p className="text-2xl font-bold text-foreground">{records.filter(r => r.status?.toUpperCase() === 'PRESENT').length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Late</p>
            <p className="text-2xl font-bold text-foreground">{records.filter(r => r.status?.toUpperCase() === 'LATE').length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-600 rounded-xl">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent</p>
            <p className="text-2xl font-bold text-foreground">{records.filter(r => r.status?.toUpperCase() === 'ABSENT').length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <CalendarDays size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On Leave</p>
            <p className="text-2xl font-bold text-foreground">{records.filter(r => r.status?.toUpperCase() === 'ON_LEAVE').length}</p>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-wrap items-center gap-4 py-1">
        {isAdmin && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg shadow-sm">
            <Calendar size={16} className="text-muted-foreground" />
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="text-sm font-medium outline-none bg-transparent text-foreground" 
            />
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg shadow-sm">
          <Filter size={16} className="text-muted-foreground" />
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)} 
            className="text-sm font-medium outline-none bg-transparent cursor-pointer min-w-[120px] text-foreground"
          >
            <option value="" className="bg-card">All Statuses</option>
            <option value="present" className="bg-card">Ontime</option>
            <option value="late" className="bg-card">Late</option>
            <option value="absent" className="bg-card">Absent</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                {isAdmin && <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>}
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">In Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Out Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Working Hours</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center">
                    <div className="flex justify-center"><Clock className="animate-spin text-primary/40" size={32} /></div>
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0 border border-border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                          <span className="text-lg font-bold text-foreground leading-none mt-1">{new Date(r.date).getDate()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{new Date(r.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-foreground">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-muted-foreground uppercase">{r.employeeId}</p>
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border">
                        <LogIn size={12} className="text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{fmt(r.checkIn)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border">
                        <LogOut size={12} className="text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{fmt(r.checkOut)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Timer size={14} className="text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground">{Number(r.workingHours || 0).toFixed(1)}h</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {getStatusBadge(r.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-16 text-center text-muted-foreground">
                    <Calendar size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-medium">No attendance records found for this period</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}