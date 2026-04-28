'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { 
  Calendar, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  MoreVertical,
  CalendarDays,
  History,
  FileText
} from 'lucide-react';
import { hasPermission } from '@/lib/auth/rbac';

interface LeaveBalance {
  type_name: string;
  type_code: string;
  allocated_days: string;
  used_days: string;
  remaining_days: string;
  accrued_so_far: string;
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
}

type TabType = 'summary' | 'logs';

export default function LeavePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
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

  const canManageLeave = hasPermission(user?.role || '', 'MANAGE_LEAVE');

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = `/api/leave/requests?employeeId=${user?.employeeId}`;
      
      const promises = [
        fetch(endpoint),
        fetch('/api/leave/types'),
      ];

      if (user?.employeeId) {
        promises.push(fetch(`/api/leave/balances?employeeId=${user.employeeId}`));
      }

      const results = await Promise.all(promises);
      const data = await Promise.all(results.map(r => r.json()));
      
      if (data[0].success) setRequests(data[0].requests);
      if (data[1].success) setLeaveTypes(data[1].types);
      if (data[2]?.success) setBalances(data[2].balances);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

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

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    }[status] || 'bg-gray-100 text-gray-700 border-gray-200';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalAvailable = balances.reduce((acc, b) => acc + (b.type_code === 'UL' ? 0 : parseFloat(b.remaining_days || '0')), 0);
  const totalConsumed = balances.reduce((acc, b) => acc + parseFloat(b.used_days || '0'), 0);

  return (
    <div className="w-full py-8 px-6 space-y-6">
      {/* Keka-style Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leave</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your leaves and view balance</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Leave Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <CalendarDays size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Leaves</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{totalAvailable.toFixed(1)}</span>
              <span className="text-xs font-medium text-muted-foreground/60">Days</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consumable Leave</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{totalAvailable.toFixed(1)}</span>
              <span className="text-xs font-medium text-muted-foreground/60">Days</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 text-orange-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consumed Leaves</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{totalConsumed.toFixed(1)}</span>
              <span className="text-xs font-medium text-muted-foreground/60">Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border">
        <button 
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'summary' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Summary
          {activeTab === 'summary' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'logs' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Leave Logs
          {activeTab === 'logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((bal, idx) => (
              <div key={idx} className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{bal.type_name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-semibold text-foreground">
                        {bal.type_code === 'UL' ? '∞' : bal.remaining_days}
                      </span>
                      <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">Days</span>
                    </div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg text-muted-foreground">
                    <CalendarDays size={20} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Consumed: <span className="text-foreground">{bal.used_days}</span></span>
                  <span className="text-muted-foreground">Total: <span className="text-foreground">{bal.type_code === 'UL' ? '∞' : bal.allocated_days}</span></span>
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming / Recent Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <History size={18} className="text-muted-foreground" />
                  Recent Requests
                </h3>
                <button onClick={() => setActiveTab('logs')} className="text-xs font-medium text-primary hover:underline">View all</button>
              </div>
              <div className="divide-y divide-border">
                {loading ? (
                  <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>
                ) : requests.length > 0 ? (
                  requests.slice(0, 5).map((req) => (
                    <div key={req.id} className="px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          req.status === 'approved' ? 'bg-green-500/10 text-green-600' : 
                          req.status === 'rejected' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{req.type_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(req.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            <span className="mx-2">•</span>
                            {req.total_days} Days
                          </p>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(req.status)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-muted-foreground text-sm">No recent requests</div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <FileText size={18} className="text-muted-foreground" />
                Leave Policy
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">Standard Policy</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Apply at least 2 days in advance for casual leaves and 1 week for planned leaves.</p>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    Max 2 days of SL can be taken without medical certificate.
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    Half-day leaves are available for Morning/Afternoon sessions.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <Loader2 className="animate-spin mx-auto text-primary" size={24} />
                    </td>
                  </tr>
                ) : requests.length > 0 ? (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {new Date(req.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          to {new Date(req.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {req.type_name}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {req.total_days}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-muted-foreground hover:text-foreground">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">
                      No leave records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">Apply Leave</h2>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleApply} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Leave Type</label>
                  <select 
                    required 
                    value={formData.leaveTypeId} 
                    onChange={e => setFormData({...formData, leaveTypeId: e.target.value})} 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  >
                    <option value="">Select Category</option>
                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                   <label className="flex items-center gap-2 cursor-pointer group">
                     <input 
                       type="checkbox" 
                       checked={formData.isHalfDay} 
                       onChange={e => setFormData({...formData, isHalfDay: e.target.checked})}
                       className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                     />
                     <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Apply for Half Day</span>
                   </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">From Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">To Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.endDate} 
                    onChange={e => setFormData({...formData, endDate: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" 
                  />
                </div>
              </div>

              {formData.isHalfDay && (
                <div className="space-y-1.5 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <label className="text-xs font-semibold text-slate-700 block mb-2">Half Day Session</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="halfDay" value="morning" checked={formData.halfDayType === 'morning'} onChange={e => setFormData({...formData, halfDayType: e.target.value})} className="text-primary focus:ring-primary/20" />
                      <span className="text-xs text-slate-600">Morning Session</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="halfDay" value="afternoon" checked={formData.halfDayType === 'afternoon'} onChange={e => setFormData({...formData, halfDayType: e.target.value})} className="text-primary focus:ring-primary/20" />
                      <span className="text-xs text-slate-600">Afternoon Session</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Reason</label>
                <textarea 
                  rows={3} 
                  required 
                  value={formData.reason} 
                  onChange={e => setFormData({...formData, reason: e.target.value})} 
                  placeholder="Explain why you are taking leave..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm resize-none" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowApplyModal(false)} 
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow-sm hover:bg-primary/90 active:scale-95 transition-all"
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
