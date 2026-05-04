'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  CalendarOff,
  Activity,
  Cake,
  Calendar,
  FileText,
  UserPlus,
  ClipboardList,
  Shield,
  UserSquare2,
} from 'lucide-react';
import { RemoteClockIn } from '@/components/RemoteClockIn';

export default function AdminDashboard({ data }: { data: any }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('celebrations');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const orgStats = data?.stats || { totalEmployees: 0, presentToday: 0, pendingLeaves: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My attendance</h3>
          </div>
          <div className="text-3xl font-black tracking-tighter text-foreground mb-4">
            {currentTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>
          <RemoteClockIn />
          <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest mt-3">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl flex flex-col min-h-0 sm:min-h-[220px]">
            <div className="border-b border-border bg-background p-2 flex gap-1">
              {['celebrations', 'holidays'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="p-4 flex-1">
              {activeTab === 'celebrations' ? (
                <div className="space-y-2">
                  {(data?.upcomingBirthdays || []).length > 0 ? (
                    data.upcomingBirthdays.slice(0, 3).map((b: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-muted/10 rounded-xl border border-border/50">
                        <Cake size={12} className="text-rose-500" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-foreground truncate">{b.name}</p>
                          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">{b.date}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic text-center py-10">No upcoming celebrations</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {(data?.holidays || []).length > 0 ? (
                    data.holidays.slice(0, 3).map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-muted/10 rounded-xl border border-border/50">
                        <Calendar size={12} className="text-emerald-500" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-foreground truncate">{h.name}</p>
                          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">
                            {new Date(h.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic text-center py-10">No upcoming holidays</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 lg:p-6 flex flex-col">
            <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-border pb-3">
              <CalendarOff size={14} className="text-rose-500" /> Out of office today
            </h3>
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[160px]">
              {(data?.onLeaveToday || []).length > 0 ? (
                data.onLeaveToday.map((emp: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-muted/10 rounded-xl">
                    <div className="w-5 h-5 rounded-xl bg-muted flex items-center justify-center text-[7px] font-black text-muted-foreground shrink-0">
                      {emp.avatar}
                    </div>
                    <span className="text-[10px] font-bold text-foreground truncate">{emp.name}</span>
                    <span
                      className={`ml-auto text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-xl ${
                        emp.status === 'ON-LEAVE' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {emp.status === 'ON-LEAVE' ? 'Leave' : 'Absent'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center italic text-muted-foreground text-[10px]">Full house today</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Quick links</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {(
              [
                { href: '/employees', title: 'Employees', subtitle: 'Directory & roles', icon: Users },
                { href: '/documents', title: 'Documents', subtitle: 'Policies & files', icon: FileText },
                { href: '/hire', title: 'Hire', subtitle: 'Recruitment', icon: UserPlus },
                { href: '/admin/leave', title: 'Leave admin', subtitle: 'Approvals & rules', icon: ClipboardList },
                { href: '/team', title: 'Team', subtitle: 'Reporting lines', icon: UserSquare2 },
                { href: '/admin/access-control', title: 'Access control', subtitle: 'Users & permissions', icon: Shield },
              ] as const
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 motion-safe:hover:-translate-y-0.5"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors shrink-0">
                  <item.icon className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.subtitle}</p>
                  <p className="text-sm font-black text-foreground tracking-tight truncate">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              {
                label: 'Total staff',
                value: orgStats.totalEmployees ?? 0,
                icon: Users,
                wrap: 'bg-primary/10 text-primary',
              },
              {
                label: 'Present today',
                value: orgStats.presentToday ?? 0,
                icon: UserCheck,
                wrap: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              },
              {
                label: 'Pending leaves',
                value: orgStats.pendingLeaves ?? 0,
                icon: CalendarOff,
                wrap: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
              },
            ] as const
          ).map((s, i) => (
            <div key={i} className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
              <div className={`p-2 rounded-xl shrink-0 ${s.wrap}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] tracking-wider uppercase text-muted-foreground font-black">{s.label}</p>
                <h3 className="text-xl font-black text-foreground leading-none">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-xs font-black text-foreground flex items-center gap-2 mb-4 uppercase tracking-wider">
            <Activity className="text-primary" size={16} /> Live activity
          </h2>
          <div className="space-y-2">
            {(data?.liveEvents || []).slice(0, 8).map((ev: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 bg-muted/20 rounded-xl border border-transparent hover:border-primary/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-tight text-primary truncate">{ev.employeeName}</p>
                  <p className="text-[8px] text-muted-foreground font-bold">{ev.type.toUpperCase()}</p>
                </div>
                <span className="text-[8px] text-muted-foreground font-black bg-muted px-2 py-1 rounded-xl ml-2">
                  {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My leaves</h3>
            <a href="/leave" className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">
              View
            </a>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(data?.leaveBalances || []).slice(0, 3).map((lb: any, i: number) => (
              <div key={i} className="bg-muted/30 border border-border p-3 rounded-xl text-center">
                <p className="text-sm font-black text-foreground leading-none">{lb.remaining}</p>
                <p className="text-[7px] font-black text-muted-foreground uppercase mt-1 tracking-tighter truncate">{lb.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
