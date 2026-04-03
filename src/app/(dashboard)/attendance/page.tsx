'use client';

import { useEffect, useState } from 'react';
import { Clock, Filter, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workingHours: number;
  source: string;
}

const statusColors: Record<string, string> = {
  present: 'bg-accent-500/15 text-accent-400',
  absent: 'bg-danger-500/15 text-danger-500',
  late: 'bg-warning-500/15 text-warning-500',
  'half-day': 'bg-purple-500/15 text-purple-400',
  'on-leave': 'bg-primary-500/15 text-primary-400',
  holiday: 'bg-blue-500/15 text-blue-400',
};

export default function AttendancePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchAttendance(); }, [date, statusFilter, user]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (statusFilter) params.set('status', statusFilter);
      if (!isAdmin && user?.employeeId) {
        params.set('employeeId', user.employeeId);
      }
      
      const res = await fetch(`/api/attendance?${params}`);
      const data = await res.json();
      if (data.success) setRecords(data.attendance);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleClockAction = async (action: 'check_in' | 'check_out') => {
    if (!user?.employeeId || !user?.tenantId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'web',
          employeeId: user.employeeId,
          tenantId: user.tenantId
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchAttendance();
      } else {
        alert(data.error || 'Failed to record attendance');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerProcessing = async () => {
    try {
      const res = await fetch('/api/attendance/process', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Processing complete');
      fetchAttendance();
    } catch (err) { console.error(err); }
  };

  const formatTime = (t: string | null) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Clock className="w-7 h-7 text-primary-400" /> {isAdmin ? 'Employee Attendance' : 'My Attendance'}
          </h1>
          <p className="text-white/40 text-sm mt-1">{records.length} records for {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {isAdmin ? (
          <div className="flex gap-3">
            <a href="/attendance/terminal" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-white text-sm font-medium border border-white/10 transition-all">
              Open Scanner Terminal
            </a>
            <button onClick={triggerProcessing} className="gradient-primary px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all">
              Process Biometric Logs
            </button>
          </div>
        ) : (
          date === new Date().toISOString().split('T')[0] && (
            <div className="flex gap-3">
              <button
                onClick={() => handleClockAction('check_in')}
                disabled={loading || records.some(r => r.checkIn)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2
                  ${records.some(r => r.checkIn) 
                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
                    : 'gradient-primary text-white shadow-lg shadow-primary-500/20 active:scale-95'}`}
              >
                Clock In
              </button>
              <button
                onClick={() => handleClockAction('check_out')}
                disabled={loading || !records.some(r => r.checkIn) || records.some(r => r.checkOut)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2
                  ${(!records.some(r => r.checkIn) || records.some(r => r.checkOut))
                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 active:scale-95'}`}
              >
                Clock Out
              </button>
            </div>
          )
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <Filter className="w-4 h-4 text-white/30" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors">
          <option value="" className="bg-surface-900">All Statuses</option>
          {['present', 'absent', 'late', 'half-day', 'on-leave'].map((s) => (
            <option key={s} value={s} className="bg-surface-900 capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['present', 'absent', 'late', 'half-day', 'on-leave'].map((s) => (
          <div key={s} className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{records.filter((r) => r.status === s).length}</p>
            <p className="text-xs text-white/40 capitalize mt-1">{s}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Employee ID', 'Check In', 'Check Out', 'Working Hours', 'Status', 'Source'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-primary-400 font-mono">{r.employeeId}</td>
                    <td className="py-3 px-4 text-sm text-white/70">{formatTime(r.checkIn)}</td>
                    <td className="py-3 px-4 text-sm text-white/70">{formatTime(r.checkOut)}</td>
                    <td className="py-3 px-4 text-sm text-white/60">{Number(r.workingHours || 0).toFixed(1)}h</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[r.status] || ''}`}>{r.status}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-white/40 capitalize">{r.source}</td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-white/30">No attendance records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
