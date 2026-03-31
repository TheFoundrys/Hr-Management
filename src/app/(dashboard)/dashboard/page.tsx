'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { Users, Clock, CalendarOff, TrendingUp, UserCheck, UserX, AlertCircle } from 'lucide-react';
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
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#22c55e', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) setData(json.dashboard);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
              <div className="h-8 bg-white/10 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats || { totalEmployees: 0, presentToday: 0, absentToday: 0, pendingLeaves: 0, attendanceRate: 0 };

  const statCards = [
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'from-primary-500 to-purple-500', shadow: 'shadow-primary-500/20' },
    { label: 'Present Today', value: stats.presentToday, icon: UserCheck, color: 'from-accent-500 to-emerald-500', shadow: 'shadow-accent-500/20' },
    { label: 'Absent Today', value: stats.absentToday, icon: UserX, color: 'from-danger-500 to-rose-500', shadow: 'shadow-danger-500/20' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: CalendarOff, color: 'from-warning-500 to-amber-500', shadow: 'shadow-warning-500/20' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-white/40 mt-1">Here&apos;s what&apos;s happening at your university today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300 animate-slide-up`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white/50">{card.label}</span>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} ${card.shadow} shadow-lg flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            {card.label === 'Total Employees' && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-accent-500" />
                <span className="text-xs text-accent-400">{stats.attendanceRate}% attendance</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly Attendance Trend */}
        <div className="xl:col-span-2 glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Weekly Attendance Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weeklyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="present" fill="#6366f1" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Department Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(data?.departmentStats || []).map((d) => ({ name: d._id, value: d.count }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  stroke="none"
                >
                  {(data?.departmentStats || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {(data?.departmentStats || []).slice(0, 4).map((dept, i) => (
              <div key={dept._id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-white/60">{dept._id}</span>
                </div>
                <span className="text-white/80 font-medium">{dept.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Leave Requests</h2>
        {(data?.recentLeaves || []).length === 0 ? (
          <div className="flex items-center gap-3 text-white/30 py-8 justify-center">
            <AlertCircle className="w-5 h-5" />
            <span>No recent leave requests</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-medium text-white/40 py-3 px-4">Employee</th>
                  <th className="text-left text-xs font-medium text-white/40 py-3 px-4">Type</th>
                  <th className="text-left text-xs font-medium text-white/40 py-3 px-4">Period</th>
                  <th className="text-left text-xs font-medium text-white/40 py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentLeaves || []).map((leave, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-white/70">{leave.employeeId}</td>
                    <td className="py-3 px-4 text-sm text-white/70 capitalize">{leave.leaveType}</td>
                    <td className="py-3 px-4 text-sm text-white/50">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                        ${leave.status === 'pending' ? 'bg-warning-500/15 text-warning-500' : ''}
                        ${leave.status === 'approved' ? 'bg-accent-500/15 text-accent-500' : ''}
                        ${leave.status === 'rejected' ? 'bg-danger-500/15 text-danger-500' : ''}
                      `}>
                        {leave.status}
                      </span>
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
