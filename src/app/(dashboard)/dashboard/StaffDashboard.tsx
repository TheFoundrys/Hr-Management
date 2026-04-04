'use client';

import React from 'react';
import { 
  UserCheck, CalendarOff, Clock, AlertCircle, 
  ChevronRight, CalendarDays, Activity, Building2, MapPin
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

export default function StaffDashboard({ data }: { data: any }) {
  const { user } = useAuthStore();
  const stats = data?.stats || { 
    presentDays: 0, 
    absentDays: 0, 
    lateDays: 0, 
    leaveDays: 0, 
    pendingLeaves: 0 
  };
  
  const staffCards = [
    { label: 'Attended Days', value: stats.presentDays, icon: UserCheck, color: 'primary' },
    { label: 'Utilized Leaves', value: stats.leaveDays, icon: CalendarOff, color: 'indigo' },
    { label: 'Pending Requests', value: stats.pendingLeaves, icon: Clock, color: 'amber' },
    { label: 'Late Reports', value: stats.lateDays, icon: AlertCircle, color: 'rose' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Monthly Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {staffCards.map((card, i) => (
          <div key={i} className="bg-card border rounded-xl p-6 shadow-sm hover:border-primary/20 transition-all flex items-center justify-between group">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 mb-1 leading-tight">{card.label}</p>
              <p className="text-3xl font-bold text-foreground font-mono">{card.value}</p>
              <p className="text-[9px] text-muted-foreground font-medium uppercase mt-2 opacity-40">Monthly Cycle: 2026-X</p>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-${card.color}-500/10 text-${card.color}-500 flex items-center justify-center transition-transform group-hover:scale-105`}>
              <card.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Attendance Log */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
             <h2 className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Attendance Log
             </h2>
          </div>
          <div className="p-4 space-y-2">
            {(data?.attendance || []).slice(0, 7).map((att: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-4 border-b last:border-0 hover:bg-muted/30 px-4 rounded-lg transition-colors group">
                <div className="space-y-1">
                   <p className="text-xs font-bold text-foreground leading-tight uppercase italic">{new Date(att.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                   <p className="text-[10px] text-muted-foreground font-mono">
                      {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} - {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                   </p>
                </div>
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest italic flex items-center gap-2 ${
                  att.status === 'present' ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : 
                  att.status === 'late' ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' : 'text-rose-500 bg-rose-500/10 border border-rose-500/20'
                }`}>
                   <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                   {att.status}
                </span>
              </div>
            ))}
            {(data?.attendance || []).length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-20">
                 <MapPin className="mb-4" />
                 <p className="text-xs font-bold uppercase tracking-widest italic">No Records Found</p>
              </div>
            )}
          </div>
        </div>

        {/* Leave Summary */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
             <h2 className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                Administrative Requests
             </h2>
          </div>
          <div className="p-4 space-y-2">
            {(data?.leaves || []).slice(0, 7).map((leave: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-4 border-b last:border-0 hover:bg-muted/30 px-4 rounded-lg transition-colors group">
                <div className="space-y-1">
                   <p className="text-xs font-bold text-foreground leading-tight uppercase italic">{leave.leaveType}</p>
                   <p className="text-[10px] text-muted-foreground font-mono">
                      {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}
                   </p>
                </div>
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest italic ${
                  leave.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : 
                  leave.status === 'rejected' ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' : 'text-amber-500 bg-amber-500/10 border border-amber-500/20'
                }`}>
                   {leave.status}
                </span>
              </div>
            ))}
            {(data?.leaves || []).length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-20">
                 <Building2 className="mb-4" />
                 <p className="text-xs font-bold uppercase tracking-widest italic">No Pending Requests</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Access Points Quickbar */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
               <Activity size={20} />
            </div>
            <div>
               <p className="text-sm font-bold uppercase tracking-tight italic">Structural Navigation Active</p>
               <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-60">System operational at node {user?.id?.slice(0, 8)}</p>
            </div>
         </div>
         <button className="flex items-center gap-3 bg-primary text-secondary px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-xl">
           Initiate Duty Log <ChevronRight size={16} />
         </button>
      </div>
    </div>
  );
}
