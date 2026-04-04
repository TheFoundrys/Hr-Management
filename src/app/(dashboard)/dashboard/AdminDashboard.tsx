'use client';

import React from 'react';
import { 
  Users, UserCheck, UserX, CalendarOff, Clock, TrendingUp, AlertCircle, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';

export default function AdminDashboard({ data }: { data: any }) {
  const stats = data?.stats || { 
    totalEmployees: 0, 
    presentToday: 0, 
    absentToday: 0, 
    pendingLeaves: 0, 
    attendanceRate: 0 
  };

  const statCards = [
    { label: 'Total Workforce', value: stats.totalEmployees, icon: Users, trend: '+2.4%', up: true },
    { label: 'Active Today', value: stats.presentToday, icon: UserCheck, trend: '+12%', up: true },
    { label: 'Absent Personnel', value: stats.absentToday, icon: UserX, trend: '-3.1%', up: false },
    { label: 'Leave Requests', value: stats.pendingLeaves, icon: CalendarOff, trend: '4 Pending', up: true },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="bg-card border rounded-xl p-6 shadow-sm hover:border-primary/20 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                <card.icon className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${card.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                {card.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {card.trend}
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 mb-1">{card.label}</p>
            <p className="text-3xl font-bold text-foreground font-mono">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Weekly Trend Chart */}
        <div className="xl:col-span-2 bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight italic">
                   <Activity className="w-5 h-5 text-primary" />
                   Analytical Trend
                </h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Weekly attendance performance distribution</p>
             </div>
             <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary" /> Present</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent</div>
             </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weeklyTrend || []} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                   dataKey="day" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                   contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="present" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Feed Sidebar */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
           <div className="p-6 border-b bg-muted/20">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-3">
                 <Clock className="w-4 h-4 text-emerald-500 animate-pulse" />
                 Live Activity
              </h2>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] scrollbar-hide">
              {data?.liveEvents?.length > 0 ? (
                 data.liveEvents.map((ev: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-transparent hover:border-primary/20 transition-all group">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity">
                             {ev.type.replace('_', ' ')}
                          </p>
                          <p className="text-xs font-bold italic">{ev.employeeId}</p>
                       </div>
                       <p className="text-[10px] font-mono opacity-30 group-hover:opacity-60 transition-opacity">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                 ))
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 py-10">
                    <TrendingUp size={32} className="mb-2 opacity-10" />
                    <p className="text-[10px] font-bold uppercase tracking-widest italic">Waiting for signal...</p>
                 </div>
              )}
           </div>
           
           <div className="p-4 bg-muted/10 border-t">
              <button className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                 View Systematic Logs <ChevronRight size={14} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
