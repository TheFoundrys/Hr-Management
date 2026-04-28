'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Cake, PartyPopper, 
  Users, MessageSquare, ThumbsUp, MoreHorizontal,
  Clock, Calendar, Monitor, MousePointer2,
  Plus, Award, Heart, Zap, Star, Trophy, Medal,
  Activity, TrendingUp, UserCheck, CalendarOff, AlertCircle
} from 'lucide-react';

export default function StaffDashboard({ data }: { data: any }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('birthdays');
  const [isPraiseModalOpen, setIsPraiseModalOpen] = useState(false);
  const [praiseForm, setPraiseForm] = useState({ toEmployeeId: '', title: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [localPraises, setLocalPraises] = useState(data?.praises || []);

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

  const handleComment = () => {
    alert("Comments feature coming soon!");
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
        setIsPraiseModalOpen(false);
        setPraiseForm({ toEmployeeId: '', title: '', message: '' });
        window.location.reload(); // Quick refresh to show new praise
      }
    } catch (err) {
      alert('Failed to post praise');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = data?.stats || { presentDays: 0, leaveDays: 0, pendingLeaves: 0, lateDays: 0 };
  const holidays = data?.holidays || [];
  const onLeaveToday = data?.onLeaveToday || [];
  const leaveBalances = data?.leaveBalances || [];
  const birthdays = data?.birthdaysToday || [];
  const praises = data?.praises || [];
  const upcomingBirthdays = data?.upcomingBirthdays || [];

  // --- Gamification Logic ---
  const calculateStreak = () => {
    const attendance = data?.attendance || [];
    if (!attendance.length) return 0;
    const sorted = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentStreak = 0;
    for (const record of sorted) {
      const status = record.status?.toUpperCase();
      if (status === 'PRESENT' || status === 'LATE') currentStreak++;
      else break;
    }
    return currentStreak;
  };

  const streak = calculateStreak();
  const level = Math.floor(stats.presentDays / 15) + 1;
  const xpProgress = Math.min(100, Math.round(((stats.presentDays % 15) / 15) * 100));

  const badges = [
    { id: 'early', label: 'Early Bird', icon: Zap, active: stats.lateDays < 2 && stats.presentDays > 5 },
    { id: 'consistent', label: 'Consistent', icon: Star, active: stats.presentDays > 20 },
    { id: 'planner', label: 'Planner', icon: Calendar, active: stats.leaveDays > 0 },
    { id: 'master', label: 'Pro', icon: Trophy, active: level > 1 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500 pb-10">
      
      {/* LEFT COLUMN - Utility & Gamification (4/12) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Time & Clock In */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attendance Clock</h3>
             <div className="flex items-center gap-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-tighter border border-primary/20">
               <Zap size={10} className="fill-current" /> {streak} Day Streak
             </div>
          </div>
          <div className="text-3xl font-black tracking-tighter text-foreground mb-6">
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <button className="w-full bg-primary text-secondary py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mb-3">
            <MousePointer2 size={12} /> Web Clock-In
          </button>
          <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Level Progression */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
           <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Current Status</p>
                <h4 className="text-xl font-black text-foreground">Level {level}</h4>
              </div>
              <span className="text-[10px] font-black text-primary uppercase">{xpProgress}% to Level {level + 1}</span>
           </div>
           <div className="h-2 bg-muted rounded-full overflow-hidden mb-3 border border-border">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000" 
                style={{ width: `${xpProgress}%` }} 
              />
           </div>
           <p className="text-[9px] text-muted-foreground font-medium italic">
             Complete {15 - (stats.presentDays % 15)} more present days to level up!
           </p>
        </div>

        {/* Achievements */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Unlocked Badges</h3>
          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge) => (
              <div 
                key={badge.id} 
                title={badge.label}
                className={`aspect-square rounded-lg flex items-center justify-center transition-all border
                  ${badge.active ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-muted/30 border-transparent text-muted-foreground opacity-30 grayscale'}
                `}
              >
                <badge.icon size={18} />
              </div>
            ))}
          </div>
        </div>

        {/* Holiday Banner - Simplified */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 relative overflow-hidden group">
           <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Next Holiday</h3>
              <h2 className="text-xl font-black text-foreground tracking-tight">{holidays[0]?.name || 'Stay Tuned'}</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                {holidays[0]?.date ? new Date(holidays[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : 'Calendar Update Pending'}
              </p>
           </div>
           <Calendar className="absolute -right-4 -bottom-4 w-24 h-24 text-primary/10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        {/* Leave Balances - Simplified */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Leave Balances</h3>
            <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {leaveBalances.map((lb: any, i: number) => (
              <div key={i} className="bg-muted/30 border border-border p-3 rounded-lg text-center">
                <p className="text-sm font-black text-foreground leading-none">{lb.remaining}</p>
                <p className="text-[7px] font-black text-muted-foreground uppercase mt-1 tracking-tighter truncate">{lb.name}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN - Feed & Social (8/12) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Off-Duty Today */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Off-Duty Today</h3>
            <div className="flex flex-wrap gap-2">
            {onLeaveToday.length > 0 ? onLeaveToday.map((emp: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-[8px] shrink-0">
                  {emp.avatar || emp.name?.[0]}
                </div>
                <span className="text-[10px] font-bold text-foreground uppercase tracking-tight whitespace-nowrap">{emp.name}</span>
              </div>
            )) : (
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 italic">Full House! Everyone is in today.</p>
            )}
          </div>
        </div>

        {/* Celebrations Tabs - Simplified */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
           <div className="flex border-b border-border bg-muted/20 overflow-x-auto no-scrollbar">
              {['birthdays', 'anniversaries', 'joinees'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[120px] px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:bg-background/50'}`}
                >
                  {tab === 'birthdays' ? `${birthdays.length} Birthdays` : `0 ${tab}`}
                </button>
              ))}
           </div>
           
           <div className="p-4 lg:p-6">
              {activeTab === 'birthdays' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                   <div>
                     <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-4 border-l-2 border-primary pl-2">Today</h4>
                     <div className="space-y-4">
                        {birthdays.length > 0 ? birthdays.map((b: any, i: number) => (
                          <div key={i} className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-black text-sm border border-cyan-500/20 shrink-0">
                                {b.name?.[0]}
                             </div>
                             <div>
                               <p className="text-xs font-black text-foreground uppercase tracking-tight">{b.name}</p>
                               <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">Send Wish</button>
                             </div>
                          </div>
                        )) : (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase italic opacity-60">No birthdays today</p>
                        )}
                     </div>
                   </div>

                   <div>
                     <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-4 border-l-2 border-primary pl-2">Upcoming</h4>
                     <div className="space-y-4">
                        {upcomingBirthdays.length > 0 ? upcomingBirthdays.slice(0, 3).map((ub: any, i: number) => (
                          <div key={i} className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center font-black text-[10px] text-muted-foreground shrink-0">
                               {ub.name?.[0]}
                             </div>
                             <div>
                               <p className="text-[10px] font-bold text-foreground uppercase tracking-tight">{ub.name}</p>
                               <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{ub.date}</p>
                             </div>
                          </div>
                        )) : (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase italic opacity-60">None in the next 30 days</p>
                        )}
                     </div>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Praise / Social Feed - Simplified Cards */}
        {/* Quick Actions / Praise */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 text-primary rounded-lg"><MessageSquare size={16} /></div>
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recognize someone today?</p>
           </div>
           <button 
             onClick={() => setIsPraiseModalOpen(true)}
             className="px-4 py-2 bg-primary text-secondary rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest"
           >
             <Plus size={14} /> Add Praise
           </button>
        </div>
        <div className="space-y-4">
           {localPraises.map((p: any) => (
             <div key={p.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20 italic">
                        {p.from ? p.from.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '👤'}
                      </div>
                      <div>
                         <p className="text-xs font-bold text-foreground">
                            <span className="text-primary">{p.from}</span> praised <span className="text-primary">{p.to}</span>
                         </p>
                         <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{p.timestamp}</p>
                      </div>
                   </div>
                   <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-full transition-all">
                      <MoreHorizontal size={14} />
                   </button>
                </div>

                <div className="bg-muted/20 border border-border rounded-lg p-4 flex items-start gap-4 mb-4">
                   <Award size={18} className="text-primary mt-0.5" />
                   <div>
                      <h4 className="text-xs font-black text-foreground uppercase tracking-tight leading-none">{p.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed font-medium italic opacity-90">
                         "{p.message}"
                      </p>
                   </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                   <div className="flex gap-4">
                      <button 
                        onClick={() => handleLike(p.id)}
                        className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-all active:scale-95"
                      >
                         <ThumbsUp size={12} /> Like
                      </button>
                      <button 
                        onClick={handleComment}
                        className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-all active:scale-95"
                      >
                         <MessageSquare size={12} /> Comment
                      </button>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                         <div className="w-4 h-4 rounded-full bg-rose-500 text-white border-2 border-background flex items-center justify-center"><Heart size={6} className="fill-current" /></div>
                         <div className="w-4 h-4 rounded-full bg-blue-500 text-white border-2 border-background flex items-center justify-center"><ThumbsUp size={6} className="fill-current" /></div>
                      </div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{p.reactions} • {p.comments}</span>
                   </div>
                </div>
             </div>
           ))}
        </div>

      </div>

      {/* Praise Modal */}
      {isPraiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in duration-200">
             <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20 rounded-t-2xl">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 text-primary rounded-lg"><Award size={18} /></div>
                   <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Give Praise</h2>
                </div>
                <button onClick={() => setIsPraiseModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><Plus size={20} className="rotate-45" /></button>
             </div>
             <form onSubmit={handlePraiseSubmit} className="p-6 space-y-4">
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
                     placeholder="Tell them why they're awesome..."
                     className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none text-sm font-medium resize-none"
                     value={praiseForm.message}
                     onChange={(e) => setPraiseForm({ ...praiseForm, message: e.target.value })}
                   />
                </div>
                <button 
                  disabled={submitting}
                  type="submit"
                  className="w-full bg-primary text-secondary py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {submitting ? 'Posting...' : 'Share Praise'} <PartyPopper size={14} />
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
