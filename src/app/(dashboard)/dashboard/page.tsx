'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { Loader2, Cake, PartyPopper } from 'lucide-react';
import { hasPermission } from '@/lib/auth/rbac';
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
      <p className="text-muted-foreground text-sm font-medium animate-pulse">Syncing platform intelligence...</p>
    </div>
  );

  const role = (user?.role || '').toUpperCase().replace(/-/g, '_');
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || hasPermission(user?.role || '', 'VIEW_ALL_EMPLOYEES');

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground flex items-center gap-3">
            Welcome, <span className="text-primary">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-xs font-bold uppercase tracking-widest leading-none">
            {isSuperAdmin ? "Global Intelligence Overview" : (isAdmin ? "Organization Overview" : "My Workspace")}
          </p>
        </div>
        <div className="w-fit flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-[10px] font-black tracking-widest uppercase text-foreground shadow-soft">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Platform Active
        </div>
      </header>

      {data.birthdaysToday && data.birthdaysToday.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-6 flex items-center gap-6 animate-pulse-subtle shadow-lg shadow-primary/5">
          <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
            <Cake className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <PartyPopper size={14} /> Celebration Alert
            </h2>
            <p className="text-foreground font-bold mt-1">
              Happy Birthday to {data.birthdaysToday.map((b: any) => b.name).join(', ')}! 🎂
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
              Let's make their day special with a celebration!
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
