'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { 
  Inbox as InboxIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import { hasPermission } from '@/lib/auth/rbac';

interface LeaveRequest {
  id: string;
  type_name: string;
  start_date: string;
  end_date: string;
  total_days: string;
  status: string;
  reason: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  emp_string_id: string;
}

export default function InboxPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leave/requests?status=pending');
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

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
        setRequests(requests.filter(r => r.id !== requestId));
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!hasPermission(user?.role || '', 'MANAGE_LEAVE')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
         <div className="p-4 bg-muted rounded-full mb-4"><InboxIcon size={40} className="text-muted-foreground" /></div>
         <h1 className="text-xl font-bold">Inbox</h1>
         <p className="text-muted-foreground mt-2 max-w-xs">Your inbox is clear! Only managers can see pending approvals here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto py-8 px-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <InboxIcon size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Inbox</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Pending Approvals & Tasks</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-muted rounded-xl border border-border flex items-center gap-2">
           <Clock size={16} className="text-amber-500" />
           <span className="text-xs font-black text-foreground">{requests.length} Pending</span>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : requests.length > 0 ? (
          requests.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft hover:border-primary/30 transition-all group">
               <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center font-black text-lg text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        {req.first_name[0]}{req.last_name[0]}
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{req.first_name} {req.last_name}</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{req.emp_string_id} • {req.type_name}</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-6 bg-muted/30 p-3 rounded-xl border border-border/50">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Duration</span>
                        <span className="text-xs font-bold text-foreground">{req.total_days} Days</span>
                     </div>
                     <ArrowRight size={14} className="text-muted-foreground/30" />
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Schedule</span>
                        <span className="text-xs font-bold text-foreground">
                           {new Date(req.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(req.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                     </div>
                  </div>

                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => handleAction(req.id, 'rejected')}
                       className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors"
                     >
                        Reject
                     </button>
                     <button 
                       onClick={() => handleAction(req.id, 'approved')}
                       className="px-6 py-2 bg-primary text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                     >
                        Approve
                     </button>
                  </div>
               </div>
               
               {req.reason && (
                 <div className="px-6 py-4 bg-muted/20 border-t border-border/50">
                    <p className="text-xs text-muted-foreground italic">" {req.reason} "</p>
                 </div>
               )}
            </div>
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
             <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-500" />
             </div>
             <h3 className="text-lg font-bold text-foreground">All Clear!</h3>
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">You have no pending approvals in your inbox.</p>
          </div>
        )}
      </div>
    </div>
  );
}
