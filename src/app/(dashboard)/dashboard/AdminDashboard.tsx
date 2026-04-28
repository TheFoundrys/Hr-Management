'use client';
import { Users, UserCheck, CalendarOff, Activity, ThumbsUp, MessageSquare, Award, Trash2, Heart, MoreHorizontal, PartyPopper, Plus, Cake } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AdminDashboard({ data }: { data: any }) {
  const stats = data?.stats || { totalEmployees: 0, presentToday: 0, pendingLeaves: 0 };
  const [localPraises, setLocalPraises] = useState(data?.praises || []);
  const [activeTab, setActiveTab] = useState('celebrations');
  const [isPraiseModalOpen, setIsPraiseModalOpen] = useState(false);
  const [praiseForm, setPraiseForm] = useState({ toEmployeeId: '', title: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLocalPraises(data?.praises || []);
  }, [data?.praises]);

  const handleLike = async (praiseId: string) => {
    try {
      const res = await fetch('/api/praises/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ praiseId })
      });
      const resData = await res.json();
      if (resData.success) {
        setLocalPraises(localPraises.map((p: any) => {
          if (p.id === praiseId) {
            return { ...p, reactions: resData.liked ? p.reactions + 1 : p.reactions - 1 };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error('Failed to toggle like');
    }
  };

  const handleDelete = async (praiseId: string) => {
    if (!confirm('Are you sure you want to delete this praise?')) return;
    try {
      const res = await fetch(`/api/praises/${praiseId}`, { method: 'DELETE' });
      if (res.ok) {
        setLocalPraises(localPraises.filter((p: any) => p.id !== praiseId));
      }
    } catch (err) {
      alert('Failed to delete praise');
    }
  };

  const handlePraiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/praises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(praiseForm)
      });
      const resData = await res.json();
      if (resData.success) {
        setLocalPraises([
          {
            ...resData.praise,
            from: 'You',
            to: (data?.allEmployees || []).find((e: any) => e.id === praiseForm.toEmployeeId)?.first_name || 'Colleague',
            timestamp: 'Just now',
            reactions: 0,
            comments: 0
          },
          ...localPraises
        ]);
        setIsPraiseModalOpen(false);
        setPraiseForm({ toEmployeeId: '', title: '', message: '' });
      }
    } catch (err) {
      console.error('Failed to post praise');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {[
          { label: 'Total Staff', value: stats.totalEmployees, icon: Users, color: 'primary' },
          { label: 'Ontime Today', value: stats.presentToday, icon: UserCheck, color: 'emerald-500' },
          { label: 'Pending Leaves', value: stats.pendingLeaves, icon: CalendarOff, color: 'amber-500' }
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border p-5 lg:p-6 rounded-2xl flex items-center gap-4 lg:gap-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`p-3 lg:p-4 bg-${s.color === 'primary' ? 'primary' : s.color}/10 text-${s.color === 'primary' ? 'primary' : s.color} rounded-xl shrink-0`}>
              <s.icon className="w-6 h-6 lg:w-7 lg:h-7" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs tracking-wider uppercase text-muted-foreground font-semibold mb-0.5">{s.label}</p>
              <h3 className="text-2xl lg:text-4xl font-black text-foreground leading-none">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / MAIN COLUMN (8/12) */}
        <div className={`space-y-6 ${data?.tenantType === 'COMPANY' || data?.tenantType === 'CORPORATE' ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          
          {/* Organization Pulse Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Birthdays & Holidays Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
               <div className="p-3 lg:p-4 border-b border-border bg-muted/20 flex gap-2 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveTab('celebrations')}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'celebrations' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    Celebrations
                  </button>
                  <button 
                    onClick={() => setActiveTab('holidays')}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'holidays' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    Holidays
                  </button>
               </div>
               <div className="p-4 lg:p-5 flex-1 min-h-[160px]">
                  {activeTab === 'celebrations' ? (
                    <div className="space-y-2">
                      {data?.upcomingBirthdays?.length > 0 ? data.upcomingBirthdays.slice(0, 3).map((b: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/10 rounded-xl border border-border/50">
                           <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg shrink-0"><Cake size={14} /></div>
                           <div className="min-w-0">
                              <p className="text-[11px] font-black text-foreground truncate">{b.name}</p>
                              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-0.5">{b.date}</p>
                           </div>
                        </div>
                      )) : (
                        <div className="py-8 text-center italic text-muted-foreground text-xs">No upcoming birthdays</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data?.holidays?.length > 0 ? data.holidays.slice(0, 3).map((h: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/10 rounded-xl border border-border/50">
                           <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0"><CalendarOff size={14} /></div>
                           <div className="min-w-0">
                              <p className="text-[11px] font-black text-foreground truncate">{h.name}</p>
                              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-0.5">{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                           </div>
                        </div>
                      )) : (
                        <div className="py-8 text-center italic text-muted-foreground text-xs">No upcoming holidays</div>
                      )}
                    </div>
                  )}
               </div>
            </div>

            {/* On Leave Today Card */}
            <div className="bg-card border border-border rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col">
               <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-border pb-3 shrink-0">
                  <Heart size={14} className="text-rose-500" /> Out of Office Today
               </h3>
               <div className="flex-1 space-y-2 max-h-[160px] lg:max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {data?.onLeaveToday?.length > 0 ? data.onLeaveToday.map((emp: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-muted/10 rounded-lg group hover:bg-muted/30 transition-colors">
                       <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-[8px] font-black text-muted-foreground shrink-0">{emp.avatar}</div>
                       <span className="text-[10px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{emp.name}</span>
                       <span className={`ml-auto text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${emp.status === 'ON-LEAVE' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {emp.status === 'ON-LEAVE' ? 'Leave' : 'Absent'}
                       </span>
                    </div>
                  )) : (
                    <div className="py-10 text-center italic text-muted-foreground text-xs flex flex-col items-center gap-2">
                       <UserCheck size={20} className="opacity-20" />
                       Full house today!
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Live Activity Section */}
          <div className="bg-card border border-border rounded-2xl p-4 lg:p-6 shadow-sm">
            <h2 className="text-sm lg:text-lg font-bold text-foreground flex items-center gap-2 mb-4 lg:mb-6 uppercase tracking-wider">
              <Activity className="text-primary" size={20} /> Live Activity
            </h2>
            <div className="space-y-2">
              {data?.liveEvents?.length ? data.liveEvents.slice(0, 5).map((ev: any, i: number) => (
                <div key={i} className="group flex justify-between items-center p-3 lg:p-4 bg-muted/20 rounded-xl border border-transparent hover:border-primary/30 transition-colors">
                   <div className="flex flex-col min-w-0">
                     <span className="text-xs font-black uppercase tracking-tight text-primary truncate">{ev.employeeName || 'System'}</span>
                     <span className="text-[10px] text-muted-foreground font-bold truncate">{ev.type.replace('_', ' ').toUpperCase()} • {ev.employeeId || 'ID'}</span>
                   </div>
                   <span className="text-[10px] text-muted-foreground font-black tracking-widest bg-muted px-2 py-1 rounded-md shrink-0 ml-3">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )) : (
                <div className="py-12 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs font-medium">
                   Waiting for live activity...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - SOCIAL FEED (4/12) */}
        {(data?.tenantType === 'COMPANY' || data?.tenantType === 'CORPORATE') && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5 lg:p-6 shadow-sm h-full flex flex-col">
              <h2 className="text-sm font-black text-foreground flex items-center justify-between mb-6 uppercase tracking-wider border-b border-border pb-4 shrink-0">
                <span className="flex items-center gap-2"><PartyPopper className="text-primary" size={16} /> Social Feed</span>
                <button 
                  onClick={() => setIsPraiseModalOpen(true)}
                  className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                  title="Add Praise"
                >
                  <Plus size={14} />
                </button>
              </h2>
              
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[600px] lg:max-h-none">
                 {localPraises.length > 0 ? localPraises.map((p: any) => (
                   <div key={p.id} className="bg-muted/10 border border-border rounded-xl p-4 lg:p-5 shadow-sm relative group transition-all hover:border-primary/30">
                      
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="absolute top-4 right-4 p-1.5 bg-rose-500/10 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 lg:group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                        title="Delete Praise"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex justify-between items-start mb-4">
                         <div className="flex gap-3 pr-8">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] border border-primary/20 italic shrink-0">
                              {p.from ? p.from.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '👤'}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[11px] font-bold text-foreground leading-tight truncate">
                                  <span className="text-primary">{p.from}</span> praised <span className="text-primary">{p.to}</span>
                               </p>
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{p.timestamp}</p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-background border border-border rounded-lg p-3 flex items-start gap-3 mb-4">
                         <Award size={14} className="text-primary mt-0.5 shrink-0" />
                         <div className="min-w-0">
                            <h4 className="text-[10px] font-black text-foreground uppercase tracking-tight leading-none truncate">{p.title}</h4>
                            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed font-medium italic opacity-90 break-words">
                               "{p.message}"
                            </p>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                         <div className="flex gap-3 lg:gap-4">
                            <button 
                              onClick={() => handleLike(p.id)}
                              className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-all active:scale-95"
                            >
                               <ThumbsUp size={12} /> Like
                            </button>
                            <button 
                              onClick={() => alert("Comments feature coming soon!")}
                              className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-all active:scale-95"
                            >
                               <MessageSquare size={12} /> Comment
                            </button>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-rose-500 text-white border-2 border-background flex items-center justify-center"><Heart size={6} className="fill-current" /></div>
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{p.reactions}</span>
                         </div>
                      </div>
                   </div>
                 )) : (
                   <p className="text-xs text-center font-bold text-muted-foreground italic py-8 border border-dashed border-border rounded-xl">No praises found.</p>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Praise Modal */}
      {isPraiseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in duration-200">
             <div className="p-5 lg:p-6 border-b border-border flex justify-between items-center bg-muted/20 rounded-t-2xl">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 text-primary rounded-lg"><Award size={18} /></div>
                   <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Give Praise</h2>
                </div>
                <button onClick={() => setIsPraiseModalOpen(false)} className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted rounded-xl transition-all"><Plus className="rotate-45" size={20} /></button>
             </div>
             
             <form onSubmit={handlePraiseSubmit} className="p-5 lg:p-6 space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Who do you want to recognize?</label>
                   <select 
                     required
                     className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none text-sm font-medium appearance-none"
                     value={praiseForm.toEmployeeId}
                     onChange={(e) => setPraiseForm({ ...praiseForm, toEmployeeId: e.target.value })}
                   >
                     <option value="">Select Employee</option>
                     {(data?.allEmployees || []).map((emp: any) => (
                       <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                     ))}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Recognition Title</label>
                   <input 
                     required
                     type="text" 
                     placeholder="e.g. Outstanding Support, Great Team Player"
                     className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none text-sm font-medium"
                     value={praiseForm.title}
                     onChange={(e) => setPraiseForm({ ...praiseForm, title: e.target.value })}
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Message</label>
                   <textarea 
                     required
                     rows={4}
                     placeholder="Share some details about their great work..."
                     className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none text-sm font-medium resize-none"
                     value={praiseForm.message}
                     onChange={(e) => setPraiseForm({ ...praiseForm, message: e.target.value })}
                   />
                </div>
                <button 
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 bg-primary text-secondary rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 mt-2 shadow-lg shadow-primary/20"
                >
                  {submitting ? 'Sending Praise...' : 'Share Recognition'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
