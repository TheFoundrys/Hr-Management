'use client';

import React from 'react';
import { 
  UserCheck, CalendarOff, Clock, AlertCircle, 
  CalendarDays, Activity
} from 'lucide-react';

export default function StaffDashboard({ data }: { data: any }) {
  const stats = data?.stats || { 
    presentDays: 0, 
    leaveDays: 0, 
    pendingLeaves: 0,
    lateDays: 0 
  };
  
  const staffCards = [
    { label: 'Present', value: stats.presentDays, icon: UserCheck, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Leaves Taken', value: stats.leaveDays, icon: CalendarOff, color: 'text-primary bg-primary/10' },
    { label: 'Pending', value: stats.pendingLeaves, icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'Late', value: stats.lateDays, icon: AlertCircle, color: 'text-danger bg-danger/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {staffCards.map((card, i) => (
          <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Log */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="p-5 border-b border-border bg-muted/30 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Attendance</h2>
          </div>
          <div className="divide-y divide-border">
            {(data?.attendance || []).slice(0, 5).map((att: any, i: number) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-foreground">{new Date(att.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  att.status?.toLowerCase() === 'present' ? 'text-emerald-500 bg-emerald-500/10' : 
                  att.status?.toLowerCase() === 'late' ? 'text-amber-500 bg-amber-500/10' : 'text-danger bg-danger/10'
                }`}>
                  {att.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leave Requests */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="p-5 border-b border-border bg-muted/30 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Leave Requests</h2>
          </div>
          <div className="divide-y divide-border">
            {(data?.leaves || []).slice(0, 5).map((leave: any, i: number) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-tight">{leave.leaveType}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  leave.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10' : 
                  leave.status === 'rejected' ? 'text-danger bg-danger/10' : 'text-amber-500 bg-amber-500/10'
                }`}>
                  {leave.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
