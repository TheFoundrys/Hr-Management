'use client';
import { Users, UserCheck, CalendarOff, Activity } from 'lucide-react';

export default function AdminDashboard({ data }: { data: any }) {
  const stats = data?.stats || { totalEmployees: 0, presentToday: 0, pendingLeaves: 0 };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Staff', value: stats.totalEmployees, icon: Users, color: 'primary' },
          { label: 'Ontime Today', value: stats.presentToday, icon: UserCheck, color: 'emerald-500' },
          { label: 'Pending Leaves', value: stats.pendingLeaves, icon: CalendarOff, color: 'amber-500' }
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-2xl flex items-center gap-5 shadow-soft hover:-translate-y-1 transition-all duration-300">
            <div className={`p-4 bg-${s.color === 'primary' ? 'primary' : s.color}/10 text-${s.color === 'primary' ? 'primary' : s.color} rounded-xl`}>
              <s.icon size={28} />
            </div>
            <div>
              <p className="text-xs tracking-wider uppercase text-muted-foreground font-semibold mb-1">{s.label}</p>
              <h3 className="text-4xl font-black text-foreground">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6 uppercase tracking-wider">
          <Activity className="text-primary" size={20} /> Live Activity
        </h2>
        <div className="space-y-3">
          {data?.liveEvents?.length ? data.liveEvents.slice(0, 5).map((ev: any, i: number) => (
            <div key={i} className="group flex justify-between items-center p-4 bg-muted/20 rounded-xl border border-transparent hover:border-primary/30 transition-colors">
               <div className="flex flex-col">
                 <span className="text-xs font-black uppercase tracking-tight text-primary">{ev.employeeName || 'System'}</span>
                 <span className="text-[10px] text-muted-foreground font-bold">{ev.type.replace('_', ' ').toUpperCase()} • {ev.employeeId || 'ID'}</span>
               </div>
               <span className="text-[10px] text-muted-foreground font-black tracking-widest bg-muted px-2 py-1 rounded-md">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )) : (
            <div className="py-12 text-center border border-dashed border-border rounded-xl text-muted-foreground text-sm font-medium">
               Waiting for live activity...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
