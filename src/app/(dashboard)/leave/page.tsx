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
        fetch('/api/employees') // Added to fetch substitution candidates
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
    approved: <CheckCircle2 className="w-4 h-4 text-success-400" />,
    rejected: <XCircle className="w-4 h-4 text-danger-400" />,
    pending: <Clock className="w-4 h-4 text-warning-400" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CalendarOff className="w-7 h-7 text-primary-400" /> Leave Management
        </h1>
        {user?.role?.toLowerCase() !== 'admin' && (
          <button 
            onClick={() => setShowApplyModal(true)}
            className="gradient-primary px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        )}
      </div>

      {/* Balances */}
      {user?.role?.toLowerCase() !== 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((bal, idx) => (
            <div key={idx} className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <CalendarOff className="w-12 h-12 text-white" />
               </div>
               <p className="text-xs font-medium text-white/40 uppercase mb-1">{bal.type_name}</p>
               <h3 className="text-2xl font-bold text-white mb-2">{Number(bal.remaining_days)} Days</h3>
               <div className="flex items-center gap-2 text-[10px] font-medium">
                  <span className="text-white/30">Total: {Number(bal.allocated_days)}</span>
                  <span className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-white/30">Used: {Number(bal.used_days)}</span>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Approvals Section for Admins */}
      {user?.role?.toLowerCase() === 'admin' && (
        <div className="glass-card rounded-2xl overflow-hidden mb-8 border border-primary-500/10">
          <div className="p-6 border-b border-white/5 bg-primary-500/5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary-400" /> Pending Approvals
            </h2>
            <p className="text-xs text-white/40 mt-1">Review and validate leave requests based on your authority level</p>
          </div>
          <div className="p-0">
            {requests.filter(r => r.status === 'pending').map((req: any) => (
              <div key={req.id} className="p-6 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white">{req.first_name[0]}{req.last_name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{req.first_name} {req.last_name}</p>
                        <p className="text-[10px] text-primary-400 font-mono uppercase tracking-wider">{req.employee_id} • {req.type_name}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[10px] text-white/40 uppercase font-medium">
                      <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()} ({Number(req.total_days)} Days)</p>
                      {req.substitution_employee_id && <p className="text-accent-400">Sub: {req.substitution_employee_id}</p>}
                      <p className={`px-2 py-0.5 rounded-md bg-white/5 border border-white/10 ${req.current_level === 1 ? 'text-warning-400' : req.current_level === 2 ? 'text-purple-400' : 'text-blue-400'}`}>
                        Current: {req.current_level === 1 ? 'HOD' : req.current_level === 2 ? 'Dean' : 'HR'} Level
                      </p>
                    </div>
                    <p className="text-sm text-white/60 bg-white/5 p-3 rounded-xl border border-white/5 italic">"{req.reason}"</p>
                    {req.attachment_url && (
                      <a href={req.attachment_url} target="_blank" className="inline-flex items-center gap-2 text-[10px] text-primary-400 hover:text-primary-300 transition-colors uppercase font-bold tracking-widest">
                        View Document →
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button 
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-danger-400 hover:bg-danger-500/10 border border-danger-500/20 transition-all"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, 'approved')}
                      className="px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white bg-primary-500 hover:bg-primary-400 shadow-lg shadow-primary-500/20 transition-all"
                    >
                      {req.current_level < 3 ? `Validate (Level ${req.current_level})` : 'Final Appprove (HR)'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {requests.filter(r => r.status === 'pending').length === 0 && (
              <div className="py-12 text-center text-white/20 italic text-sm text-white/20">No pending approvals at this time</div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className="glass-card rounded-2xl overflow-hidden min-h-[300px]">
        <div className="p-6 border-b border-white/5">
           <h2 className="text-lg font-bold text-white">
             {user?.role?.toLowerCase() === 'admin' ? 'Recent Leave History (System-wide)' : 'Your Leave History'}
           </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {user?.role?.toLowerCase() === 'admin' && <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Employee</th>}
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Leave Type</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Period</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase text-center">Days</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Reason</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req: any) => (
                  <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    {user?.role?.toLowerCase() === 'admin' && (
                      <td className="py-4 px-6">
                        <p className="text-sm text-white/80 font-medium">{req.first_name} {req.last_name}</p>
                        <p className="text-[10px] text-white/30 font-mono uppercase">{req.employee_id}</p>
                      </td>
                    )}
                    <td className="py-4 px-6 text-sm text-white/80 font-medium">{req.type_name}</td>
                    <td className="py-4 px-6 text-sm text-white/50">
                      {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-white/80 font-bold text-center">{Number(req.total_days)}</td>
                    <td className="py-4 px-6 text-sm text-white/40">
                       <p className="max-w-xs truncate" title={req.reason}>{req.reason}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {statusIcons[req.status] || statusIcons['pending']}
                        <span className={`text-[10px] font-bold uppercase ${
                          req.status === 'approved' ? 'text-success-400' : 
                          req.status === 'rejected' ? 'text-danger-400' : 'text-warning-400'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md animate-fade-in shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Apply for Leave</h2>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase">Leave Type</label>
                <select 
                  required
                  value={formData.leaveTypeId}
                  onChange={e => setFormData({...formData, leaveTypeId: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none"
                >
                  <option value="">Select Type</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase">Start Date</label>
                  <input 
                    type="date" required 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase">End Date</label>
                  <input 
                    type="date" required 
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  checked={formData.isHalfDay}
                  onChange={e => setFormData({...formData, isHalfDay: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500" 
                />
                <span className="text-xs text-white/60">Half Day Request</span>
              </div>

              {formData.isHalfDay && (
                <div>
                   <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase">Session</label>
                   <select 
                    value={formData.halfDayType}
                    onChange={e => setFormData({...formData, halfDayType: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none"
                   >
                     <option value="morning">Morning (First Half)</option>
                     <option value="afternoon">Afternoon (Second Half)</option>
                   </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase">Substitution Faculty</label>
                <select 
                  value={formData.substitutionEmployeeId}
                  onChange={e => setFormData({...formData, substitutionEmployeeId: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none"
                >
                  <option value="">Select Faculty (if applicable)</option>
                   {employees.filter(e => e.employeeId !== user?.employeeId).map(e => (
                     <option key={e.employeeId} value={e.employeeId}>{e.name} ({e.department})</option>
                   ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase">Reason</label>
                <textarea 
                  rows={2} required
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase">Supporting Document Link</label>
                <input 
                  type="url"
                  placeholder="e.g. Google Drive link for medical cert"
                  value={formData.attachmentUrl}
                  onChange={e => setFormData({...formData, attachmentUrl: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none" 
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-white/60 hover:bg-white/5 transition-all text-sm border border-white/10"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 gradient-primary rounded-xl text-white text-sm font-medium shadow-lg hover:scale-[1.02] transition-all"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
