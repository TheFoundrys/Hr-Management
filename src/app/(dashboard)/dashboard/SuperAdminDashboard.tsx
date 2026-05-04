'use client';
import { Building2, Globe, ShieldCheck, Activity, Users, CreditCard, Sparkles } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';

export default function SuperAdminDashboard({ data }: { data: any }) {
  const stats = data?.stats || { totalTenants: 0, totalGlobalEmployees: 0, globalAttendanceToday: 0, systemUptime: '100%' };
  const tenantGrowth = data?.tenantGrowth || [];
  const recentTenants = data?.recentTenants || [];

  return (
    <div className="space-y-6 ">
      {/* Essential Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants', value: stats.totalTenants, trend: 'Global', icon: Building2, color: 'text-primary' },
          { label: 'Global Staff', value: stats.totalGlobalEmployees, trend: 'Active', icon: Users, color: 'text-indigo-500' },
          { label: 'Platform Status', value: stats.systemUptime, trend: 'Stable', icon: ShieldCheck, color: 'text-emerald-500' },
          { label: 'Daily Activity', value: stats.globalAttendanceToday, trend: 'Real-time', icon: Activity, color: 'text-rose-500' }
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border p-5 rounded-xl  hover:border-primary/20 transition-all">
            <div className="flex justify-between items-start mb-4">
               <div className={`p-3 bg-muted rounded-xl ${s.color}`}>
                  <s.icon size={20} />
               </div>
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.trend}</span>
            </div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
            <h3 className="text-2xl font-black text-foreground">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Real Data Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-card border border-border rounded-xl p-6 ">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Organization Growth</h3>
               <div className="w-2 h-2 rounded-xl bg-primary" />
            </div>
            <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tenantGrowth}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10, fontWeight: 700}} />
                    <Tooltip 
                      contentStyle={{backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0px'}}
                      labelStyle={{fontWeight: 'bold', fontSize: '12px'}}
                    />
                    <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-card border border-border rounded-xl p-6  overflow-hidden flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-6">Recent Onboarding</h3>
            <div className="flex-1 space-y-3">
               {recentTenants.length > 0 ? recentTenants.map((t: any, i: number) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Sparkles size={14} />
                       </div>
                       <div>
                          <p className="text-[11px] font-black text-foreground">{t.name}</p>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{t.tenant_type}</p>
                       </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-bold">{new Date(t.created_at).toLocaleDateString()}</span>
                 </div>
               )) : (
                 <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-xl italic text-muted-foreground text-[10px]">
                    No recent tenant activity
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
