'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { CalendarOff, Plus, Loader2, CheckCircle2, XCircle, Clock, Timer, ChevronRight, Filter, Paperclip, User } from 'lucide-react';
import { hasPermission } from '@/lib/auth/rbac';

interface LeaveBalance {
  type_name: string;
  type_code: string;
  allocated_days: string;
  used_days: string;
  remaining_days: string;
  accrued_so_far: string;
  color?: string;
}

interface LeaveRequest {
  id: string;
  type_name: string;
  start_date: string;
  end_date: string;
  total_days: string;
  status: string;
  reason: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  current_level?: number;
  attachment_url?: string;
  substitution_employee_id?: string;
}

export default function LeavePage() {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<{id: string, name: string}[]>([]);
  
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: 'morning',
    substitutionEmployeeId: '',
    attachmentUrl: ''
  });
  const [employees, setEmployees] = useState<{employeeId: string, name: string, department: string}[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const canManageLeave = hasPermission(user?.role || '', 'MANAGE_LEAVE');
      const endpoint = canManageLeave ? '/api/leave/requests' : `/api/leave/requests?employeeId=${user?.employeeId}`;
      
      const promises = [
        fetch(endpoint),
        fetch('/api/leave/types'),
        fetch('/api/employees')
      ];

      if (!canManageLeave && user?.employeeId) {
        promises.push(fetch(`/api/leave/balances?employeeId=${user.employeeId}`));
      }

      const results = await Promise.all(promises);
      const data = await Promise.all(results.map(r => r.json()));
      
      if (data[0].success) setRequests(data[0].requests);
      if (data[1].success) setLeaveTypes(data[1].types);
      if (data[2].success) setEmployees(data[2].employees);
      if (!canManageLeave && data[3]?.success) setBalances(data[3].balances);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, employeeId: user?.employeeId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowApplyModal(false);
        fetchData();
        setFormData({ 
          leaveTypeId: '', startDate: '', endDate: '', reason: '', 
          isHalfDay: false, halfDayType: 'morning', 
          substitutionEmployeeId: '', attachmentUrl: '' 
        });
      } else {
        alert(data.error || 'Failed to apply leave');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (requestId: string, status: string) => {
    const remarks = prompt(`Enter remarks for ${status}:`);
    if (remarks === null) return;
    
    try {
      const res = await fetch('/api/leave/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, remarks, approverId: user?.employeeId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusLabel = (req: any) => {
    if (req.status !== 'pending') return req.status;
    const levels: any = { 1: 'HOD', 2: 'Manager', 3: 'HR' };
    return `Pending: ${levels[req.current_level || 1]}`;
  };

  const canManageLeave = hasPermission(user?.role || '', 'MANAGE_LEAVE');

  return (
    <div className="max-w-6xl mx-auto py-6 px-6 space-y-8 animate-in fade-in duration-500">
      {/* Premium Header */}
      <header className="flex items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <CalendarOff size={28} className="text-primary" /> Leaves
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2 pl-1">
            Institutional Absence Ledger • {new Date().getFullYear()} Session
          </p>
        </div>

        <div className="flex gap-3">
          {!canManageLeave && (
            <button 
              onClick={() => setShowApplyModal(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/10 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> Apply Leave
            </button>
          )}
        </div>
      </header>

      {/* Balance Cards - Compact Grid */}
      {!canManageLeave && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {balances.map((bal, idx) => (
            <div key={idx} className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-primary/30 transition-all group">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">{bal.type_name}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-black text-foreground leading-none">
                    {bal.type_code === 'UL' ? '∞' : bal.remaining_days}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">Days Left</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                  <CheckCircle2 size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Request Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
             <Clock size={14} /> {canManageLeave ? 'Pending Approvals' : 'Recent Activity'}
           </div>
        </div>

        <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
            ) : requests.length ? requests.map((req) => (
              <div key={req.id} className="flex flex-col lg:flex-row items-center justify-between p-3 hover:bg-muted/30 transition-colors group gap-6">
                <div className="flex items-center gap-8 flex-1 w-full">
                  {/* Status Indicator */}
                  <div className="w-12 text-center shrink-0">
                    <div className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                      req.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {req.status === 'approved' ? <CheckCircle2 size={20} /> : req.status === 'rejected' ? <XCircle size={20} /> : <Clock size={20} />}
                    </div>
                  </div>

                  <div className="h-10 w-[1px] bg-border hidden lg:block" />

                  {/* Info Grid */}
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-8 items-center w-full">
                    <div className="col-span-2 lg:col-span-1">
                      <p className="text-sm font-black text-foreground tracking-tight">{req.type_name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                        {canManageLeave ? `${req.first_name} ${req.last_name}` : `ID: ${req.id.slice(0, 8)}`}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Period</p>
                      <p className="text-xs font-bold text-foreground">
                        {new Date(req.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(req.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>

                    <div className="hidden lg:block">
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Duration</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-foreground">{Number(req.total_days)} Days</span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                       <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Reason</p>
                       <p className="text-xs font-medium text-muted-foreground truncate max-w-[120px] italic">"{req.reason}"</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                  {canManageLeave && req.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(req.id, 'rejected')} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">Reject</button>
                      <button onClick={() => handleAction(req.id, 'approved')} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-primary text-primary-foreground hover:opacity-90 transition-all">Approve</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        req.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 
                        req.status === 'rejected' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        {getStatusLabel(req)}
                      </span>
                      {req.attachment_url && <a href={req.attachment_url} className="p-2 text-muted-foreground hover:text-primary"><Paperclip size={16} /></a>}
                    </div>
                  )}
                  <ChevronRight size={18} className="text-border group-hover:text-primary group-hover:translate-x-1 transition-all hidden lg:block" />
                </div>
              </div>
            )) : (
              <div className="py-24 text-center">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">No Leave Records Found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card rounded-[2rem] p-8 w-full max-w-md shadow-2xl space-y-6 border border-border">
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Apply Leave</h2>
            
            <form onSubmit={handleApply} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Leave Type</label>
                <select required value={formData.leaveTypeId} onChange={e => setFormData({...formData, leaveTypeId: e.target.value})} className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-bold outline-none focus:border-primary transition-all text-foreground">
                  <option value="" className="bg-card">Select Category</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id} className="bg-card">{t.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">From</label>
                  <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-bold outline-none focus:border-primary text-foreground" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">To</label>
                  <input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-bold outline-none focus:border-primary text-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for Absence</label>
                <textarea rows={3} required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium outline-none focus:border-primary text-foreground" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted rounded-2xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/10 hover:opacity-90 transition-all">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
