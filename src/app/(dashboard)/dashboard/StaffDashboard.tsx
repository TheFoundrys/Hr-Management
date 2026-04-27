'use client';

import React from 'react';
import {
  UserCheck, CalendarOff, Clock, AlertCircle,
  CalendarDays, Activity, Trophy, Star, Zap, Medal
} from 'lucide-react';

export default function StaffDashboard({ data }: { data: any }) {
  const stats = data?.stats || {
    presentDays: 0,
    leaveDays: 0,
    pendingLeaves: 0,
    lateDays: 0
  };

  const staffCards = [
    { label: 'Ontime', value: stats.presentDays, icon: UserCheck, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Leaves Taken', value: stats.leaveDays, icon: CalendarOff, color: 'text-primary bg-primary/10' },
    { label: 'Pending', value: stats.pendingLeaves, icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'Late', value: stats.lateDays, icon: AlertCircle, color: 'text-danger bg-danger/10' },
  ];

  // Real Gamification Logic (Weekend-Aware)
  const calculateStreak = () => {
    const attendance = data?.attendance || [];
    if (!attendance.length) return 0;

    // Sort by date descending
    const sorted = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let currentStreak = 0;
    const today = new Date();

    // Helper to check if a date is a weekend
    const isWeekend = (date: Date) => {
      const day = date.getDay();
      return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    };

    // Helper to get the previous working day
    const getPrevWorkingDay = (date: Date) => {
      const prev = new Date(date);
      prev.setDate(prev.getDate() - 1);
      while (isWeekend(prev)) {
        prev.setDate(prev.getDate() - 1);
      }
      return prev.toISOString().split('T')[0];
    };

    // Start checking from the most recent record
    const latestRecordDate = new Date(sorted[0].date);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0];

    // If today is Mon/Sun/Sat, and last record was Friday, it's still an active streak
    let expectedLastDate = todayStr;
    if (isWeekend(today)) {
      expectedLastDate = getPrevWorkingDay(today);
    } else if (today.getDay() === 1) { // Monday
      // If no record today, Friday is also acceptable
      const lastDateStr = sorted[0].date.split('T')[0];
      if (lastDateStr !== todayStr && lastDateStr !== yesterdayStr) {
        // If today is Monday and last record was not today or Sunday, check if it was Friday
        const friday = new Date(today);
        friday.setDate(friday.getDate() - 3);
        if (lastDateStr !== friday.toISOString().split('T')[0]) return 0;
      }
    } else {
      const lastDateStr = sorted[0].date.split('T')[0];
      if (lastDateStr !== todayStr && lastDateStr !== yesterdayStr) return 0;
    }

    for (let i = 0; i < sorted.length; i++) {
      const status = sorted[i].status?.toUpperCase();
      if (status === 'PRESENT' || status === 'LATE') {
        currentStreak++;

        // Check if next record is the previous working day
        if (i + 1 < sorted.length) {
          const currentDate = new Date(sorted[i].date);
          const nextDate = new Date(sorted[i + 1].date);
          const expectedPrevDate = getPrevWorkingDay(currentDate);
          const actualNextDate = nextDate.toISOString().split('T')[0];

          if (actualNextDate !== expectedPrevDate) {
            // Check if maybe they worked on a weekend?
            const diffDays = Math.round((currentDate.getTime() - nextDate.getTime()) / (1000 * 3600 * 24));
            if (diffDays > 1 && !isWeekend(new Date(currentDate.getTime() - 86400000))) break;
          }
        }
      } else {
        break;
      }
    }
    return currentStreak;
  };

  const streak = calculateStreak();
  const level = Math.floor(stats.presentDays / 15) + 1; // Faster leveling for demo
  const xpInCurrentLevel = Math.min(100, Math.round(((stats.presentDays % 15) / 15) * 100));

  const badges = [
    { id: 'early', label: 'Early Bird', icon: Zap, active: stats.lateDays < 2 && stats.presentDays > 5, desc: 'Punctual with minimal late marks' },
    { id: 'consistent', label: 'Consistent', icon: Star, active: stats.presentDays > 50, desc: 'Over 50 days of active service' },
    { id: 'planner', label: 'Planner', icon: CalendarDays, active: stats.leaveDays > 5, desc: 'Efficiently planned time off' },
    { id: 'master', label: 'Pro', icon: Trophy, active: level > 3, desc: 'Reached Level 4 and beyond' },
  ];

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {staffCards.map((card, i) => (
          <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Gamification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress & Level */}
        <div className="lg:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Trophy className="w-32 h-32 text-primary" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest">
                Career Milestone
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-6xl font-black text-foreground">{level}</h2>
                <span className="text-lg font-bold text-muted-foreground uppercase tracking-widest">Level</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs font-medium italic">"Your attendance consistency is building your professional track record."</p>
            </div>

            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Experience Progress</p>
                  <p className="text-2xl font-bold text-foreground">{xpInCurrentLevel}% <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest ml-1">to milestone {level + 1}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Active Streak</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                    <span className="text-xl font-bold text-foreground">{streak} Days</span>
                  </div>
                </div>
              </div>
              <div className="h-4 bg-muted border border-border rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                  style={{ width: `${xpInCurrentLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="bg-card border border-border p-8 rounded-[2rem] shadow-soft">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Achievements</h2>
            <div className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center">
              <Medal className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all duration-300 gap-3 text-center
                  ${badge.active
                    ? 'bg-primary/5 border-primary/20 grayscale-0'
                    : 'bg-muted/50 border-border grayscale opacity-50'}
                `}
              >
                <div className={`p-3 rounded-2xl ${badge.active ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground'}`}>
                  <badge.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tight text-foreground">{badge.label}</p>
                  {badge.active && <p className="text-[8px] text-primary font-bold uppercase tracking-widest mt-0.5">Unlocked</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Log */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="p-5 border-b border-border bg-muted/30 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Attendance</h2>
          </div>
          <div className="divide-y divide-border">
            {(data?.attendance || []).slice(0, 5).map((att: any, i: number) => (
              <div key={i} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-muted/50 transition-colors gap-3 sm:gap-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <p className="text-xs font-bold text-foreground">{new Date(att.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                    <div className="flex flex-col">
                      <span className="uppercase text-[8px] tracking-widest text-slate-400">In</span>
                      <span>{att.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '--:--'}</span>
                    </div>
                    {att.checkOut && (
                      <div className="flex flex-col">
                        <span className="uppercase text-[8px] tracking-widest text-slate-400">Out</span>
                        <span>{new Date(att.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${att.status?.toLowerCase() === 'present' ? 'text-emerald-500 bg-emerald-500/10' :
                    att.status?.toLowerCase() === 'late' ? 'text-amber-500 bg-amber-500/10' : 'text-danger bg-danger/10'
                    }`}>
                    {att.status?.toUpperCase() === 'PRESENT' ? 'ONTIME' : att.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leave Requests */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="p-5 border-b border-border bg-muted/30 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Leave Requests</h2>
          </div>
          <div className="divide-y divide-border">
            {(data?.leaves || []).slice(0, 5).map((leave: any, i: number) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-tight">{leave.leaveType}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${leave.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10' :
                  leave.status === 'rejected' ? 'text-danger bg-danger/10' : 'text-amber-500 bg-amber-500/10'
                  }`}>
                  {leave.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
