'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, CalendarOff, Activity, ThumbsUp, MessageSquare, 
  Award, Trash2, Heart, MoreHorizontal, PartyPopper, Plus, Cake,
  Clock, Zap, Star, Trophy, MousePointer2, Calendar
} from 'lucide-react';

export default function AdminDashboard({ data }: { data: any }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('celebrations');
  const [isPraiseModalOpen, setIsPraiseModalOpen] = useState(false);
  const [praiseForm, setPraiseForm] = useState({ toEmployeeId: '', title: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [localPraises, setLocalPraises] = useState(data?.praises || []);

  useEffect(() => {
    setLocalPraises(data?.praises || []);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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

  // --- Personal Stats (Copied from StaffDashboard) ---
  const personalStats = data?.stats || { presentDays: 0, leaveDays: 0, pendingLeaves: 0, lateDays: 0 };
  // --- Organizational Stats ---
  const orgStats = data?.stats || { totalEmployees: 0, presentToday: 0, pendingLeaves: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
      
      {/* LEFT COLUMN - Personal Utilities (4/12) */}
      <div className="lg:col-span-4 space-y-6">
        

        {/* Attendance Clock */}
        <div className="bg-card border border-border rounded-none p-6">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My Attendance</h3>
          </div>
          <div className="text-3xl font-black tracking-tighter text-foreground mb-6">
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <button className="w-full bg-primary text-secondary py-3 rounded-none font-black text-[10px] uppercase tracking-widest hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mb-3">
            <MousePointer2 size={12} /> Web Clock-In
          </button>
          <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Pulse & Activity Grid (Moved from Right) */}
        <div className="space-y-6">
           {/* Celebrations & Holidays */}
           <div className="bg-card border border-border rounded-none flex flex-col min-h-[250px]">
              <div className="border-b border-border bg-background p-2 flex gap-1">
                 {['celebrations', 'holidays'].map((t) => (
                   <button 
                     key={t}
                     onClick={() => setActiveTab(t)}
                     className={`px-3 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                   >
                     {t}
                   </button>
                 ))}
              </div>
              <div className="p-4 flex-1">
                 {activeTab === 'celebrations' ? (
                   <div className="space-y-2">
                     {(data?.upcomingBirthdays || []).length > 0 ? data.upcomingBirthdays.slice(0, 3).map((b: any, i: number) => (
                       <div key={i} className="flex items-center gap-3 p-2 bg-muted/10 rounded-none border border-border/50">
                          <Cake size={12} className="text-rose-500" />
                          <div className="min-w-0">
                             <p className="text-[10px] font-black text-foreground truncate">{b.name}</p>
                             <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">{b.date}</p>
                          </div>
                       </div>
                     )) : <p className="text-[10px] text-muted-foreground italic text-center py-10">No upcoming celebrations</p>}
                   </div>
                 ) : (
                   <div className="space-y-2">
                     {(data?.holidays || []).length > 0 ? data.holidays.slice(0, 3).map((h: any, i: number) => (
                       <div key={i} className="flex items-center gap-3 p-2 bg-muted/10 rounded-none border border-border/50">
                          <Calendar size={12} className="text-emerald-500" />
                          <div className="min-w-0">
                             <p className="text-[10px] font-black text-foreground truncate">{h.name}</p>
                             <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">{new Date(h.date).toLocaleDateString()}</p>
                          </div>
                       </div>
                     )) : <p className="text-[10px] text-muted-foreground italic text-center py-10">No upcoming holidays</p>}
                   </div>
                 )}
              </div>
           </div>

           {/* Out of Office Today */}
           <div className="bg-card border border-border rounded-none p-4 lg:p-6 flex flex-col">
              <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-border pb-3">
                 <Heart size={14} className="text-rose-500" /> Out of Office Today
              </h3>
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[160px]">
                 {(data?.onLeaveToday || []).length > 0 ? data.onLeaveToday.map((emp: any, i: number) => (
                   <div key={i} className="flex items-center gap-3 p-2 bg-muted/10 rounded-none">
                      <div className="w-5 h-5 rounded-none bg-muted flex items-center justify-center text-[7px] font-black text-muted-foreground shrink-0">{emp.avatar}</div>
                      <span className="text-[10px] font-bold text-foreground truncate">{emp.name}</span>
                      <span className={`ml-auto text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-none ${emp.status === 'ON-LEAVE' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'}`}>
                         {emp.status === 'ON-LEAVE' ? 'Leave' : 'Absent'}
                      </span>
                   </div>
                 )) : <div className="py-10 text-center italic text-muted-foreground text-[10px]">Full house today!</div>}
              </div>
           </div>
        </div>

      </div>

      {/* RIGHT COLUMN - Organization Controls (8/12) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Admin Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Staff', value: orgStats.totalEmployees, icon: Users, color: 'primary' },
            { label: 'Present Today', value: orgStats.presentToday, icon: UserCheck, color: 'emerald-500' },
            { label: 'Pending Leaves', value: orgStats.pendingLeaves, icon: CalendarOff, color: 'amber-500' }
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border p-4 rounded-none flex items-center gap-4">
              <div className={`p-2 bg-${s.color === 'primary' ? 'primary' : s.color}/10 text-${s.color === 'primary' ? 'primary' : s.color} rounded-none shrink-0`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] tracking-wider uppercase text-muted-foreground font-black">{s.label}</p>
                <h3 className="text-xl font-black text-foreground leading-none">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Live Activity & Social Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Live Activity */}
           <div className="bg-card border border-border rounded-none p-5">
              <h2 className="text-xs font-black text-foreground flex items-center gap-2 mb-4 uppercase tracking-wider">
                <Activity className="text-primary" size={16} /> Live Activity
              </h2>
              <div className="space-y-2">
                {(data?.liveEvents || []).slice(0, 4).map((ev: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-muted/20 rounded-none border border-transparent hover:border-primary/30 transition-colors">
                     <div className="min-w-0">
                       <p className="text-[10px] font-black uppercase tracking-tight text-primary truncate">{ev.employeeName}</p>
                       <p className="text-[8px] text-muted-foreground font-bold">{ev.type.toUpperCase()}</p>
                     </div>
                     <span className="text-[8px] text-muted-foreground font-black bg-muted px-2 py-1 rounded-none ml-2">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
           </div>

           {/* Social Feed */}
           <div className="bg-card border border-border rounded-none p-5 flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
                 <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                    <PartyPopper className="text-primary" size={14} /> Social Feed
                 </h2>
                 <button onClick={() => setIsPraiseModalOpen(true)} className="p-1 bg-primary/10 text-primary rounded-none hover:bg-primary hover:text-white transition-colors">
                    <Plus size={12} />
                 </button>
              </div>
              <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1 max-h-[300px]">
                 {localPraises.slice(0, 3).map((p: any) => (
                   <div key={p.id} className="bg-muted/10 border border-border rounded-none p-3 relative group transition-all">
                      <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 p-1 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={10} />
                      </button>
                      <p className="text-[9px] font-bold text-foreground">
                        <span className="text-primary">{p.from}</span> &rarr; <span className="text-primary">{p.to}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 italic">"{p.message}"</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Leave Balances (Moved from Left) */}
        <div className="bg-card border border-border rounded-none p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My Leaves</h3>
            <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">View</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(data?.leaveBalances || []).slice(0, 3).map((lb: any, i: number) => (
              <div key={i} className="bg-muted/30 border border-border p-3 rounded-none text-center">
                <p className="text-sm font-black text-foreground leading-none">{lb.remaining}</p>
                <p className="text-[7px] font-black text-muted-foreground uppercase mt-1 tracking-tighter truncate">{lb.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Praise Modal */}
      {isPraiseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-none w-full max-w-md">
             <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h2 className="text-[10px] font-black uppercase tracking-widest">Give Praise</h2>
                <button onClick={() => setIsPraiseModalOpen(false)}><Plus className="rotate-45" size={18} /></button>
             </div>
             <form onSubmit={handlePraiseSubmit} className="p-5 space-y-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Employee</label>
                   <select required className="w-full px-3 py-2 bg-muted/30 border border-border rounded-none text-xs outline-none" value={praiseForm.toEmployeeId} onChange={(e) => setPraiseForm({ ...praiseForm, toEmployeeId: e.target.value })}>
                     <option value="">Select</option>
                     {(data?.allEmployees || []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Title</label>
                   <input required type="text" className="w-full px-3 py-2 bg-muted/30 border border-border rounded-none text-xs outline-none" value={praiseForm.title} onChange={(e) => setPraiseForm({ ...praiseForm, title: e.target.value })} />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Message</label>
                   <textarea required rows={3} className="w-full px-3 py-2 bg-muted/30 border border-border rounded-none text-xs outline-none resize-none" value={praiseForm.message} onChange={(e) => setPraiseForm({ ...praiseForm, message: e.target.value })} />
                </div>
                <button disabled={submitting} type="submit" className="w-full py-3 bg-primary text-secondary rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">
                  {submitting ? 'Sending...' : 'Post Praise'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
