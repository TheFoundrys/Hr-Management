'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { Loader2 } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(json => json.success && setData(json.dashboard))
      .catch(console.error);

    const sse = new EventSource('/api/attendance/events');
    sse.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      setData((prev: any) => prev ? {
        ...prev,
        stats: { ...prev.stats, presentToday: prev.stats.presentToday + (ev.type === 'check_in' ? 1 : 0) },
        liveEvents: [{ employeeId: ev.employeeId, employeeName: ev.employeeName, type: ev.type, timestamp: ev.timestamp }, ...(prev.liveEvents || [])].slice(0, 10)
      } : prev);
    };
    return () => sse.close();
  }, [user]);

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-muted-foreground text-sm font-medium animate-pulse">Synchronizing Node Data...</p>
    </div>
  );

  const isAdmin = ['admin', 'super_admin'].includes(user?.role?.toLowerCase() || '');
  const isNonTeaching = user?.role?.toLowerCase() === 'non_teaching';

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex justify-between items-center pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            Welcome, <span className="text-primary">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-bold uppercase tracking-widest leading-none">
            {isAdmin ? "Institutional Performance" : "Personal Work Cycle"}
          </p>
        </div>
        <div className="flex items-center gap-2 px-5 py-2 bg-card border border-border rounded-full text-[10px] font-black tracking-widest uppercase text-foreground shadow-soft">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Operational
        </div>
      </header>
      {isAdmin ? <AdminDashboard data={data} /> : <StaffDashboard data={data} />}
    </div>
  );
}
