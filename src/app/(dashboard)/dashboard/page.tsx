'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { Users, Clock, CalendarOff, TrendingUp, UserCheck, UserX, AlertCircle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardData {
  stats: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    pendingLeaves: number;
    attendanceRate: number;
  };
  weeklyTrend: Array<{ day: string; present: number; absent: number; late: number }>;
  departmentStats: Array<{ _id: string; count: number }>;
  recentLeaves: Array<{ employeeId: string; leaveType: string; status: string; startDate: string; endDate: string }>;
  liveEvents: Array<{ employeeId: string; type: string; timestamp: string }>;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#22c55e', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();

    // Real-time updates via SSE
    const eventSource = new EventSource('/api/attendance/events');
    
    eventSource.onmessage = (event) => {
      const liveData = JSON.parse(event.data);
      
      setData((prev: any) => {
        if (!prev) return prev;
        
        // Update stats
        const newStats = { ...prev.stats };
        if (liveData.type === 'check_in') {
           newStats.presentToday += 1;
           newStats.absentToday -= 1;
        }

        // Add to live events feed
        const newLiveEvents = [
          { employeeId: liveData.employeeId, type: liveData.type, timestamp: liveData.timestamp },
          ...(prev.liveEvents || [])
        ].slice(0, 10); // Keep last 10

        return {
          ...prev,
          stats: newStats,
          liveEvents: newLiveEvents
        };
      });
      
      // Flash a notification
      if (typeof window !== 'undefined') {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-8 right-8 bg-primary-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 animate-bounce flex items-center gap-3 border border-white/20 backdrop-blur-md';
        toast.innerHTML = `<span class="w-2 h-2 bg-white rounded-full animate-ping"></span> Live Update: ${liveData.employeeId} checked ${liveData.type.replace('_', ' ')}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      }
    };

    return () => eventSource.close();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData({
          ...json.dashboard,
          liveEvents: json.dashboard.liveEvents || []
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">
              Welcome back, <span className="text-primary-400">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-white/40 mt-1">
              {isAdmin ? "Here's what's happening at your university today" : "Your personal work overview for this month"}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-accent-500/10 rounded-full border border-accent-500/20">
             <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse"></span>
             <span className="text-[10px] font-bold text-accent-400 uppercase tracking-widest">Live Monitoring</span>
          </div>
        </div>
      </div>

      {isAdmin ? <AdminDashboard data={data} /> : <StaffDashboard data={data} />}
    </div>
  );
}

function AdminDashboard({ data }: { data: DashboardData }) {
  const stats = data?.stats || { totalEmployees: 0, presentToday: 0, absentToday: 0, pendingLeaves: 0, attendanceRate: 0 };

  const statCards = [
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'from-primary-500 to-purple-500', shadow: 'shadow-primary-500/20' },
    { label: 'Present Today', value: stats.presentToday, icon: UserCheck, color: 'from-accent-500 to-emerald-500', shadow: 'shadow-accent-500/20' },
    { label: 'Absent Today', value: stats.absentToday, icon: UserX, color: 'from-danger-500 to-rose-500', shadow: 'shadow-danger-500/20' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: CalendarOff, color: 'from-warning-500 to-amber-500', shadow: 'shadow-warning-500/20' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white/50">{card.label}</span>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Live Activity Feed */}
      <div className="glass-card rounded-2xl p-6 border-l-4 border-accent-500 overflow-hidden relative">
         <div className="absolute top-0 right-0 p-4 opacity-5">
            <Clock className="w-24 h-24 text-white" />
         </div>
         <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent-500 rounded-full animate-ping"></span>
            Real-time Activity Stream
         </h2>
         <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {data?.liveEvents?.length > 0 ? (
               data.liveEvents.map((ev, i) => (
                  <div key={i} className="flex-shrink-0 bg-white/5 border border-white/5 p-4 rounded-2xl min-w-[200px] animate-slide-in-right">
                     <p className="text-xs font-mono text-accent-400 font-bold uppercase mb-1">{ev.type.replace('_', ' ')}</p>
                     <p className="text-sm font-bold text-white">{ev.employeeId}</p>
                     <p className="text-[10px] text-white/30 mt-1">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                  </div>
               ))
            ) : (
               <p className="text-white/20 text-sm py-4 italic text-center w-full">Waiting for incoming logs...</p>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Weekly Attendance Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weeklyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="present" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Departmental Stats</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={(data?.departmentStats || []).map(d => ({ name: d._id, value: d.count }))} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5}>
                   {(data?.departmentStats || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

function StaffDashboard({ data }: { data: any }) {
  const stats = data?.stats || { presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0, pendingLeaves: 0 };
  
  const staffCards = [
    { label: 'Present Days', value: stats.presentDays, icon: UserCheck, color: 'from-accent-500 to-emerald-500' },
    { label: 'Leaves Taken', value: stats.leaveDays, icon: CalendarOff, color: 'from-primary-500 to-purple-500' },
    { label: 'Pending Requests', value: stats.pendingLeaves, icon: Clock, color: 'from-warning-500 to-amber-500' },
    { label: 'Late Arrivals', value: stats.lateDays, icon: AlertCircle, color: 'from-danger-500 to-rose-500' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {staffCards.map((card, i) => (
          <div key={i} className="glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white/50">{card.label}</span>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-[10px] text-white/30 uppercase mt-2 font-medium tracking-wider">This Month</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-400" /> Recent Attendance
          </h2>
          <div className="space-y-4">
            {(data?.attendance || []).slice(0, 5).map((att: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-4 rounded-xl transition-colors">
                <div>
                   <p className="text-sm font-medium text-white/80">{new Date(att.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                   <p className="text-[10px] text-white/30 lowercase">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} - {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  att.status === 'present' ? 'text-accent-400 bg-accent-400/10' : 
                  att.status === 'late' ? 'text-warning-400 bg-warning-400/10' : 'text-danger-400 bg-danger-400/10'
                }`}>{att.status}</span>
              </div>
            ))}
            {(data?.attendance || []).length === 0 && <p className="text-center py-10 text-white/20 text-sm">No attendance records yet</p>}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-primary-400" /> Recent Leaves
          </h2>
          <div className="space-y-4">
            {(data?.leaves || []).slice(0, 5).map((leave: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-4 rounded-xl transition-colors">
                <div>
                   <p className="text-sm font-medium text-white/80">{leave.leaveType}</p>
                   <p className="text-[10px] text-white/30">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  leave.status === 'approved' ? 'text-accent-400 bg-accent-400/10' : 
                  leave.status === 'rejected' ? 'text-danger-400 bg-danger-400/10' : 'text-warning-400 bg-warning-400/10'
                }`}>{leave.status}</span>
              </div>
            ))}
            {(data?.leaves || []).length === 0 && <p className="text-center py-10 text-white/20 text-sm">No leave history yet</p>}
          </div>
        </div>
      </div>
    </>
  );
}
