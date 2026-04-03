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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CalendarCheck className="w-7 h-7 text-primary-400" /> Leave Approvals
        </h1>
        <p className="text-white/40 text-sm">{requests.length} pending requests</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-30">
             <CalendarCheck className="w-16 h-16 mb-4" />
             <p className="text-lg">No pending leave requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Employee</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Leave Type</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Dates</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase text-center">Days</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase">Reason</th>
                  <th className="py-4 px-6 text-xs font-medium text-white/40 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-sm text-white/80 font-medium">{req.first_name} {req.last_name}</p>
                      <p className="text-[10px] text-white/30 font-mono uppercase">{req.employee_id}</p>
                    </td>
                    <td className="py-4 px-6 text-sm text-white/60">{req.type_name}</td>
                    <td className="py-4 px-6 text-sm text-white/50 font-mono">
                      {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-white/80 font-bold text-center">{Number(req.total_days)}</td>
                    <td className="py-4 px-6">
                       <div className="group relative">
                          <MessageSquare className="w-4 h-4 text-white/20" />
                          <div className="absolute bottom-full left-0 mb-2 w-48 p-2 glass rounded-lg text-[10px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {req.reason}
                          </div>
                       </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                       <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleAction(req.id, 'approved')}
                            disabled={processingId === req.id}
                            className="p-1.5 rounded-lg bg-success-500/10 text-success-400 hover:bg-success-500/20 transition-all disabled:opacity-50"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleAction(req.id, 'rejected')}
                            disabled={processingId === req.id}
                            className="p-1.5 rounded-lg bg-danger-500/10 text-danger-400 hover:bg-danger-500/20 transition-all disabled:opacity-50"
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
