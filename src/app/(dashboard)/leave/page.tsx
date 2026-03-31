'use client';

import { useEffect, useState } from 'react';
import { CalendarOff, Plus, X, Loader2, Check, XCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

interface LeaveRecord {
  _id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  approvedBy: string | null;
  createdAt: string;
}

export default function LeavePage() {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employeeId: '', leaveType: 'casual', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchLeaves(); }, [filter]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/leave?${params}`);
      const data = await res.json();
      if (data.success) setLeaves(data.leaves);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowModal(false); fetchLeaves(); }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleAction = async (leaveId: string, action: 'approve' | 'reject') => {
    try {
      await fetch('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId, action }),
      });
      fetchLeaves();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarOff className="w-7 h-7 text-primary-400" /> Leave Management
          </h1>
          <p className="text-white/40 text-sm mt-1">{leaves.filter((l) => l.status === 'pending').length} pending requests</p>
        </div>
        <button onClick={() => { setForm({ employeeId: '', leaveType: 'casual', startDate: '', endDate: '', reason: '' }); setShowModal(true); }} className="gradient-primary px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20">
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'approved', 'rejected'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-sm transition-all ${filter === s ? 'gradient-primary text-white shadow-lg shadow-primary-500/20' : 'glass text-white/50 hover:text-white'}`}>
            {s || 'All'}
          </button>
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
                  {['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', ...(user?.role === 'admin' ? ['Actions'] : [])].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-primary-400 font-mono">{l.employeeId}</td>
                    <td className="py-3 px-4 text-sm text-white/70 capitalize">{l.leaveType}</td>
                    <td className="py-3 px-4 text-sm text-white/50">{new Date(l.startDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm text-white/50">{new Date(l.endDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm text-white/60">{l.totalDays}</td>
                    <td className="py-3 px-4 text-sm text-white/50 max-w-[200px] truncate">{l.reason}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize
                        ${l.status === 'pending' ? 'bg-warning-500/15 text-warning-500' : ''}
                        ${l.status === 'approved' ? 'bg-accent-500/15 text-accent-400' : ''}
                        ${l.status === 'rejected' ? 'bg-danger-500/15 text-danger-500' : ''}
                      `}>{l.status}</span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="py-3 px-4">
                        {l.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleAction(l._id, 'approve')} className="p-1.5 rounded-lg bg-accent-500/15 text-accent-400 hover:bg-accent-500/25 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleAction(l._id, 'reject')} className="p-1.5 rounded-lg bg-danger-500/15 text-danger-500 hover:bg-danger-500/25 transition-colors"><XCircle className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {leaves.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-white/30">No leave records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Apply for Leave</h2>
              <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white/70"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Employee ID</label>
                <input type="text" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Leave Type</label>
                <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors">
                  {['casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'other'].map((t) => (
                    <option key={t} value={t} className="bg-surface-900 capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors resize-none" required minLength={5} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 gradient-primary rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
