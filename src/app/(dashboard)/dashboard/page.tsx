'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { Loader2, Cake } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(json => json.success && setData(json.dashboard))
      .catch(console.error);
  }, [user]);

  const role = (user?.role || '').toUpperCase().replace(/-/g, '_');
  const wantsLiveAttendance =
    role === 'SUPER_ADMIN' ||
    role === 'GLOBAL_ADMIN' ||
    role === 'ADMIN';

  useEffect(() => {
    if (!wantsLiveAttendance) return;

    const sse = new EventSource('/api/attendance/events');
    sse.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      setData((prev: any) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                presentToday:
                  (prev.stats?.presentToday ?? 0) + (ev.type === 'check_in' ? 1 : 0),
              },
              liveEvents: [
                {
                  employeeId: ev.employeeId,
                  employeeName: ev.employeeName,
                  type: ev.type,
                  timestamp: ev.timestamp,
                },
                ...(prev.liveEvents || []),
              ].slice(0, 10),
            }
          : prev
      );
    };
    return () => sse.close();
  }, [wantsLiveAttendance]);

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-muted-foreground text-sm font-medium animate-pulse">Syncing platform intelligence...</p>
    </div>
  );

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || role === 'GLOBAL_ADMIN';

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1 text-[10px] font-black uppercase tracking-widest leading-none">
            {isSuperAdmin ? "Global Intelligence" : (isAdmin ? "Organization Overview" : "My Workspace")}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-muted border border-border text-[9px] font-black tracking-widest uppercase text-foreground">
          <span className="w-1.5 h-1.5 bg-emerald-500" /> Platform Active
        </div>
      </header>

      {data.birthdaysToday && data.birthdaysToday.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 p-6 flex items-center gap-6">
          <div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Cake size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary">Celebration Alert</h2>
            <p className="text-sm font-bold mt-1">
              Happy Birthday to {data.birthdaysToday.map((b: any) => b.name).join(', ')}!
            </p>
          </div>
        </div>
      )}

      {isSuperAdmin ? (
        <SuperAdminDashboard data={data} />
      ) : (
        isAdmin ? <AdminDashboard data={data} /> : <StaffDashboard data={data} />
      )}
    </div>
  );
}
