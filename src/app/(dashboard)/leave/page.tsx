'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  FileText,
  Home
} from 'lucide-react';
import { hasPermission } from '@/lib/auth/rbac';
import { DEFAULT_LEAVE_POLICY } from '@/lib/types/tenant';

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

type TabType = 'summary' | 'logs' | 'wfh' | 'manage';

function LeavePageContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'summary');

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['summary', 'logs', 'wfh', 'manage'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
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

  const [searchTerm, setSearchTerm] = useState('');
  const [adminBalances, setAdminBalances] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [wfhMine, setWfhMine] = useState<any[]>([]);
  const [wfhPending, setWfhPending] = useState<any[]>([]);
  const [wfhWeekUsed, setWfhWeekUsed] = useState(0);
  const [wfhWeekMax, setWfhWeekMax] = useState(5);
  const [wfhLoading, setWfhLoading] = useState(false);
  const [wfhForm, setWfhForm] = useState({
    requestDate: '',
    isHalfDay: false,
    halfDayType: 'morning' as 'morning' | 'afternoon',
    reason: '',
  });

  const canManageLeave = hasPermission(
    user?.role || '',
    'MANAGE_LEAVE',
    user?.tenantSettings?.roles
  );
  const leavePolicy = { ...DEFAULT_LEAVE_POLICY, ...(user?.tenantSettings?.leave_policy || {}) };

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
      console.log('[LeavePage] Data received:', data);
      
      if (data[0].success) setRequests(data[0].requests);
      if (data[1].success) setLeaveTypes(data[1].types);
      if (data[2]?.success) {
        console.log('[LeavePage] Setting balances:', data[2].balances);
        setBalances(data[2].balances);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  const fetchWfh = async () => {
    setWfhLoading(true);
    try {
      const res = await fetch('/api/wfh/requests');
      const data = await res.json();
      if (data.success) {
        setWfhMine(data.mine || []);
        setWfhPending(data.pendingApprovals || []);
        setWfhWeekUsed(Number(data.weekDaysUsed) || 0);
        setWfhWeekMax(Number(data.weekMax) || 5);
      } else if (data.error) {
        console.warn('[LeavePage] WFH:', data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWfhLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wfh') fetchWfh();
  }, [activeTab, user]);

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

  const handleWfhSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/wfh/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wfhForm),
      });
      const data = await res.json();
      if (data.success) {
        setWfhForm({ requestDate: '', isHalfDay: false, halfDayType: 'morning', reason: '' });
        fetchWfh();
      } else {
        alert(data.error || 'WFH request failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWfhAction = async (requestId: string, status: string) => {
    const remarks = prompt(`Enter remarks for ${status}:`);
    if (remarks === null) return;
    try {
      const res = await fetch('/api/wfh/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, remarks }),
      });
      const data = await res.json();
      if (data.success) fetchWfh();
      else alert(data.error || 'Action failed');
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
    const s = (status || '').toLowerCase();
    const styles =
      {
        approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
        rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
        pending: 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/25',
      }[s] || 'bg-muted text-muted-foreground border-border';

    return (
      <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalAvailable = balances.reduce((acc, b) => acc + (b.type_code === 'UL' ? 0 : parseFloat(b.remaining_days || '0')), 0);
  const totalConsumed = balances.reduce((acc, b) => acc + parseFloat(b.used_days || '0'), 0);
  const pendingCount = requests.filter((r) => (r.status || '').toLowerCase() === 'pending').length;

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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending requests</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{pendingCount}</span>
              <span className="text-xs font-medium text-muted-foreground/60">Open</span>
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
        <button
          type="button"
          onClick={() => setActiveTab('wfh')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${activeTab === 'wfh' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Home size={16} className="opacity-80" />
          WFH
          {activeTab === 'wfh' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        {canManageLeave && (
          <button 
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'manage' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            HR Management
            {activeTab === 'manage' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        )}
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
                            <span className="mx-2">·</span>
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
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">Your organization</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {user?.tenantSettings?.leave_policy?.summary_text ||
                      'Rules below are enforced when you apply for leave. Values can be customized per tenant in settings.'}
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    Advance notice: at least {leavePolicy.advance_notice_days} calendar day(s) before the first day of leave.
                  </li>
                  {leavePolicy.max_consecutive_days > 0 ? (
                    <li className="flex items-start gap-2">
                      <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      Maximum {leavePolicy.max_consecutive_days} consecutive day(s) per request.
                    </li>
                  ) : null}
                  <li className="flex items-start gap-2">
                    <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    Sick leave over {leavePolicy.sick_leave_max_days_without_certificate} day(s) requires an attachment or certificate reference.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    Department overlap cap: at most {leavePolicy.dept_max_concurrent_approved} approved leave(s) per department for overlapping dates.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    Half-day leaves support morning or afternoon sessions.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    Work from home: use the <strong className="text-foreground">WFH</strong> tab — up to 5 day equivalents per calendar week, full or half day, approval required (same pattern as Keka-style WFH).
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
                        {canManageLeave && req.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleAction(req.id, 'approved')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Approve"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleAction(req.id, 'rejected')}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        ) : (
                          <button className="text-muted-foreground hover:text-foreground">
                            <MoreVertical size={16} />
                          </button>
                        )}
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
      {activeTab === 'wfh' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This week (WFH)</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {wfhWeekUsed.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">/ {wfhWeekMax} days</span>
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Request WFH</h3>
            <form onSubmit={handleWfhSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  required
                  value={wfhForm.requestDate}
                  onChange={(e) => setWfhForm((f) => ({ ...f, requestDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wfhForm.isHalfDay}
                    onChange={(e) => setWfhForm((f) => ({ ...f, isHalfDay: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">Half day</span>
                </label>
              </div>
              {wfhForm.isHalfDay && (
                <div className="md:col-span-2 flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="wfhHalf"
                      checked={wfhForm.halfDayType === 'morning'}
                      onChange={() => setWfhForm((f) => ({ ...f, halfDayType: 'morning' }))}
                    />
                    Morning
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="wfhHalf"
                      checked={wfhForm.halfDayType === 'afternoon'}
                      onChange={() => setWfhForm((f) => ({ ...f, halfDayType: 'afternoon' }))}
                    />
                    Afternoon
                  </label>
                </div>
              )}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={wfhForm.reason}
                  onChange={(e) => setWfhForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background resize-none"
                  placeholder="Why do you need WFH on this date?"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                >
                  Submit WFH request
                </button>
              </div>
            </form>
          </div>

          {canManageLeave && wfhPending.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border font-semibold text-foreground">Pending WFH approvals</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2">Employee</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Duration</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {wfhPending.map((w: any) => (
                      <tr key={w.id}>
                        <td className="px-4 py-2">
                          {(w.first_name || '') + ' ' + (w.last_name || '')} ({w.emp_string_id || w.employee_id})
                        </td>
                        <td className="px-4 py-2">{String(w.request_date).slice(0, 10)}</td>
                        <td className="px-4 py-2">{w.is_half_day ? `Half (${w.half_day_type || ''})` : 'Full day'}</td>
                        <td className="px-4 py-2 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleWfhAction(w.id, 'approved')}
                            className="p-1 text-green-600 hover:bg-green-500/10 rounded"
                            title="Approve"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWfhAction(w.id, 'rejected')}
                            className="p-1 text-red-600 hover:bg-red-500/10 rounded"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-border font-semibold text-foreground">My WFH requests</div>
            {wfhLoading ? (
              <div className="p-10 flex justify-center">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : wfhMine.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">No WFH requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Duration</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {wfhMine.map((w: any) => (
                      <tr key={w.id}>
                        <td className="px-4 py-2">{String(w.request_date).slice(0, 10)}</td>
                        <td className="px-4 py-2">{w.is_half_day ? `Half (${w.half_day_type || ''})` : 'Full day'}</td>
                        <td className="px-4 py-2">{getStatusBadge(w.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 uppercase tracking-tight font-black">
              <Search size={20} className="text-primary" />
              Manual Balance Adjustment
            </h3>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text"
                  placeholder="Search Employee by ID (e.g. TO-00095)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:border-primary transition-all"
                />
              </div>
              <button 
                onClick={async () => {
                   setLoading(true);
                   const res = await fetch(`/api/leave/balances?employeeId=${searchTerm}`);
                   const data = await res.json();
                   if (data.success) {
                     setAdminBalances(data.balances);
                   } else {
                     alert(data.error || 'Employee not found');
                   }
                   setLoading(false);
                }}
                className="px-8 py-2 bg-primary text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Fetch
              </button>
            </div>
          </div>

          {adminBalances.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Leave Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Allocated</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Remaining</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adminBalances.map((bal) => (
                    <tr key={bal.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-black text-foreground uppercase tracking-tight">{bal.type_name}</div>
                        <div className="text-[8px] text-primary font-black uppercase tracking-widest mt-1">{bal.type_code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          defaultValue={bal.allocated_days}
                          step="0.5"
                          id={`alloc-${bal.id}`}
                          className="w-24 px-2 py-1 bg-muted/30 border border-border rounded-xl text-[10px] font-black outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          defaultValue={bal.remaining_days}
                          step="0.01"
                          id={`rem-${bal.id}`}
                          className="w-24 px-2 py-1 bg-muted/30 border border-border rounded-xl text-[10px] font-black outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={async () => {
                            const allocated = (document.getElementById(`alloc-${bal.id}`) as HTMLInputElement).value;
                            const remaining = (document.getElementById(`rem-${bal.id}`) as HTMLInputElement).value;
                            
                            setIsUpdating(true);
                            const res = await fetch('/api/leave/balances/manual', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                balanceId: bal.id,
                                allocatedDays: allocated,
                                remainingDays: remaining
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert('SUCCESS: Balance manual override complete.');
                            } else {
                              alert('ERROR: ' + (data.error || 'Update failed'));
                            }
                            setIsUpdating(false);
                          }}
                          disabled={isUpdating}
                          className="px-4 py-2 bg-secondary text-secondary-foreground text-[8px] font-black uppercase tracking-widest rounded-xl border border-border hover:bg-muted disabled:opacity-50"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

export default function LeavePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <LeavePageContent />
    </Suspense>
  );
}
