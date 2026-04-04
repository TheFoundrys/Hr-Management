'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { Loader2 } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';

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
           newStats.presentToday = (newStats.presentToday || 0) + 1;
           newStats.absentToday = (newStats.absentToday || 0) - 1;
        }

        // Add to live events feed
        const newLiveEvents = [
          { employeeId: liveData.employeeId, type: liveData.type, timestamp: liveData.timestamp },
          ...(prev.liveEvents || [])
        ].slice(0, 10);

        return {
          ...prev,
          stats: newStats,
          liveEvents: newLiveEvents
        };
      });
      
      // Flash a notification
      if (typeof window !== 'undefined') {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-8 right-8 bg-primary text-secondary px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce flex items-center gap-3 border border-primary/20 backdrop-blur-md';
        toast.innerHTML = `<span class="w-2 h-2 bg-secondary rounded-full animate-ping"></span> Live Update: ${liveData.employeeId} checked ${liveData.type.replace('_', ' ')}`;
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Welcome, <span className="text-primary">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            {isAdmin ? "Institutional performance overview for today" : "Your personal work cycle summary"}
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-6 py-2 bg-muted/50 rounded-lg border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          Status: Operational
        </div>
      </header>

      {isAdmin ? <AdminDashboard data={data} /> : <StaffDashboard data={data} />}
    </div>
  );
}
