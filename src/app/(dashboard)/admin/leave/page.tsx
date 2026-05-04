'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { CalendarCheck, Loader2, Check, X, MessageSquare } from 'lucide-react';

interface PendingRequest {
  id: string;
  first_name: string;
  last_name: string;
  type_name: string;
  start_date: string;
  end_date: string;
  total_days: string;
  reason: string;
  employee_id: string;
}

export default function AdminLeavePage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leave/approve');
      const data = await res.json();
      if (data.success) setRequests(data.pendingRequests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (requestId: string, status: 'approved' | 'rejected') => {
    const remarks = prompt(`Enter remarks for ${status}:`) || '';
    setProcessingId(requestId);
    try {
      const res = await fetch('/api/leave/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, remarks, approverId: user?.employeeId }),
      });
      if (res.ok) {
        fetchPending();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <CalendarCheck className="w-7 h-7 text-primary shrink-0" /> Leave approvals
        </h1>
        <p className="text-muted-foreground text-sm">{requests.length} pending request(s)</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden min-h-0 sm:min-h-[280px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
             <CalendarCheck className="w-14 h-14 mb-4 opacity-40" />
             <p className="text-sm font-medium">No pending leave requests</p>
          </div>
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-left bg-muted/30">
                  <th className="py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Leave type</th>
                  <th className="py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Dates</th>
                  <th className="py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Days</th>
                  <th className="py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason</th>
                  <th className="py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-sm text-foreground font-medium">{req.first_name} {req.last_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">{req.employee_id}</p>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">{req.type_name}</td>
                    <td className="py-4 px-6 text-sm text-muted-foreground font-mono">
                      {new Date(req.start_date).toLocaleDateString()} – {new Date(req.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-foreground font-bold text-center">{Number(req.total_days)}</td>
                    <td className="py-4 px-6">
                       <div className="group relative">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" aria-hidden />
                          <div className="absolute bottom-full left-0 mb-2 w-56 max-w-[min(100vw-2rem,14rem)] p-2 glass rounded-lg text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border shadow-lg">
                            {req.reason || '—'}
                          </div>
                       </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                       <div className="flex justify-end gap-2">
                          <button 
                            type="button"
                            onClick={() => handleAction(req.id, 'approved')}
                            disabled={processingId === req.id}
                            className="p-2 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50 min-h-11 min-w-11 inline-flex items-center justify-center"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleAction(req.id, 'rejected')}
                            disabled={processingId === req.id}
                            className="p-2 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50 min-h-11 min-w-11 inline-flex items-center justify-center"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
