'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { CalendarOff, Plus, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface LeaveBalance {
  type_name: string;
  type_code: string;
  allocated_days: string;
  used_days: string;
  remaining_days: string;
}

interface LeaveRequest {
  id: string;
  type_name: string;
  start_date: string;
  end_date: string;
  total_days: string;
  status: string;
  reason: string;
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
      const is_admin = user?.role?.toLowerCase() === 'admin';
      const endpoint = is_admin ? '/api/leave/requests' : `/api/leave/requests?employeeId=${user?.employeeId}`;
      
      const promises = [
        fetch(endpoint),
        fetch('/api/leave/types'),
        fetch('/api/employees')
      ];

      if (!is_admin && user?.employeeId) {
        promises.push(fetch(`/api/leave/balances?employeeId=${user.employeeId}`));
      }

      const results = await Promise.all(promises);
      const data = await Promise.all(results.map(r => r.json()));
      
      if (data[0].success) setRequests(data[0].requests);
      if (data[1].success) setLeaveTypes(data[1].types);
      if (data[2].success) setEmployees(data[2].employees);
      if (!is_admin && data[3]?.success) setBalances(data[3].balances);
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
        alert(data.message || 'Action successful');
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
    const levels: any = { 1: 'HOD', 2: 'Dean', 3: 'HR' };
    return `Pending (${levels[req.current_level || 1]} Approval)`;
  };

  const statusIcons: any = {
    approved: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    rejected: <XCircle className="w-4 h-4 text-danger" />,
    pending: <Clock className="w-4 h-4 text-amber-500" />,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <CalendarOff className="w-7 h-7 text-primary" /> Leave Management
        </h1>
        {user?.role?.toLowerCase() !== 'admin' && (
          <button 
            onClick={() => setShowApplyModal(true)}
            className="bg-primary px-4 py-2 rounded-xl text-primary-foreground text-sm font-bold flex items-center gap-2 shadow-soft hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        )}
      </div>

      {/* Balances */}
      {user?.role?.toLowerCase() !== 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((bal, idx) => (
            <div key={idx} className="bg-card p-5 rounded-2xl border border-border relative overflow-hidden group shadow-soft">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <CalendarOff className="w-12 h-12 text-foreground" />
               </div>
               <p className="text-[10px] font-black text-muted-foreground uppercase mb-1 tracking-widest">{bal.type_name}</p>
               <h3 className="text-2xl font-black text-foreground mb-2">{Number(bal.remaining_days)} Days</h3>
               <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="text-muted-foreground">Total: {Number(bal.allocated_days)}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-muted-foreground">Used: {Number(bal.used_days)}</span>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Approvals Section for Admins */}
      {user?.role?.toLowerCase() === 'admin' && (
        <div className="bg-card rounded-2xl overflow-hidden mb-8 border border-border shadow-soft">
          <div className="p-6 border-b border-border bg-primary/5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> Pending Approvals
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Review and validate leave requests accordingly.</p>
          </div>
          <div className="divide-y divide-border">
            {requests.filter(r => r.status === 'pending').map((req: any) => (
              <div key={req.id} className="p-6 hover:bg-muted/30 transition-all group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">
                        <span>{req.first_name[0]}{req.last_name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{req.first_name} {req.last_name}</p>
                        <p className="text-[10px] text-primary font-mono uppercase tracking-wider">{req.employee_id} • {req.type_name}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">
                      <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()} ({Number(req.total_days)} Days)</p>
                      {req.substitution_employee_id && <p className="text-primary font-black uppercase">Sub: {req.substitution_employee_id}</p>}
                      <p className={`px-2 py-0.5 rounded-md bg-muted border border-border ${req.current_level === 1 ? 'text-amber-600' : req.current_level === 2 ? 'text-indigo-600' : 'text-blue-600'}`}>
                        Current: {req.current_level === 1 ? 'HOD' : req.current_level === 2 ? 'Dean' : 'HR'} Level
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted p-3 rounded-xl border border-border italic">"{req.reason}"</p>
                    {req.attachment_url && (
                      <a href={req.attachment_url} target="_blank" className="inline-flex items-center gap-2 text-[10px] text-primary hover:underline transition-all uppercase font-black tracking-widest">
                        View Document →
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button 
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-danger hover:bg-danger/10 border border-danger/20 transition-all"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, 'approved')}
                      className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary/90 shadow-soft shadow-primary/20 transition-all"
                    >
                      {req.current_level < 3 ? `Validate (Level ${req.current_level})` : 'Final Appprove (HR)'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {requests.filter(r => r.status === 'pending').length === 0 && (
              <div className="py-12 text-center text-muted-foreground/40 italic text-sm">No pending approvals at this time</div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card rounded-2xl overflow-hidden min-h-[300px] border border-border shadow-soft">
        <div className="p-6 border-b border-border bg-muted/30">
           <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
             {user?.role?.toLowerCase() === 'admin' ? 'Recent Leave History' : 'Your Leave History'}
           </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {user?.role?.toLowerCase() === 'admin' && <th className="py-4 px-6">Employee</th>}
                  <th className="py-4 px-6">Leave Type</th>
                  <th className="py-4 px-6">Period</th>
                  <th className="py-4 px-6 text-center">Days</th>
                  <th className="py-4 px-6">Reason</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {requests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    {user?.role?.toLowerCase() === 'admin' && (
                      <td className="py-4 px-6">
                        <p className="text-sm text-foreground font-bold">{req.first_name} {req.last_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase">{req.employee_id}</p>
                      </td>
                    )}
                    <td className="py-4 px-6 text-sm font-bold">{req.type_name}</td>
                    <td className="py-4 px-6 text-xs text-muted-foreground">
                      {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-sm font-black text-center">{Number(req.total_days)}</td>
                    <td className="py-4 px-6 text-xs text-muted-foreground italic truncate max-w-[150px]">
                       {req.reason}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {statusIcons[req.status] || statusIcons['pending']}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          req.status === 'approved' ? 'text-emerald-500' : 
                          req.status === 'rejected' ? 'text-danger' : 'text-amber-500'
                        }`}>
                          {getStatusLabel(req)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-md animate-slide-up shadow-2xl">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight mb-8">Apply for Leave</h2>
            <form onSubmit={handleApply} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Leave Type</label>
                <select 
                  required
                  value={formData.leaveTypeId}
                  onChange={e => setFormData({...formData, leaveTypeId: e.target.value})}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</label>
                  <input 
                    type="date" required 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Date</label>
                  <input 
                    type="date" required 
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-xl border border-border transition-all">
                <input 
                  type="checkbox" 
                  checked={formData.isHalfDay}
                  onChange={e => setFormData({...formData, isHalfDay: e.target.checked})}
                  className="w-4 h-4 rounded border-border bg-card text-primary cursor-pointer" 
                />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Half Day Configuration</span>
              </div>

              {formData.isHalfDay && (
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Session</label>
                   <select 
                    value={formData.halfDayType}
                    onChange={e => setFormData({...formData, halfDayType: e.target.value})}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none"
                   >
                     <option value="morning">Morning Shift</option>
                     <option value="afternoon">Afternoon Shift</option>
                   </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Required Substitution</label>
                <select 
                  value={formData.substitutionEmployeeId}
                  onChange={e => setFormData({...formData, substitutionEmployeeId: e.target.value})}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none cursor-pointer"
                >
                  <option value="">Select Faculty Alternate</option>
                   {employees.filter(e => e.employeeId !== user?.employeeId).map(e => (
                     <option key={e.employeeId} value={e.employeeId}>{e.name} ({e.department})</option>
                   ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Professional Reason</label>
                <textarea 
                  rows={2} required
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none transition-all" 
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted border border-border transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                >
                  Register Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
