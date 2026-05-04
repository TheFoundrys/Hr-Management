'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { RemoteClockIn } from '@/components/RemoteClockIn';

export default function StaffDashboard({ data }: { data: any }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('birthdays');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = data?.stats || { presentDays: 0, leaveDays: 0, pendingLeaves: 0, lateDays: 0 };
  const holidays = data?.holidays || [];
  const onLeaveToday = data?.onLeaveToday || [];
  const leaveBalances = data?.leaveBalances || [];
  const birthdays = data?.birthdaysToday || [];
  const upcomingBirthdays = data?.upcomingBirthdays || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Attendance clock
            </h3>
          </div>
          <div className="text-3xl font-black tracking-tighter text-foreground mb-6">
            {currentTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>
          <RemoteClockIn />
          <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest mt-4">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Next holiday</h3>
            <h2 className="text-xl font-black text-foreground tracking-tight">{holidays[0]?.name || 'Stay tuned'}</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
              {holidays[0]?.date
                ? new Date(holidays[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
                : 'Calendar update pending'}
            </p>
          </div>
          <Calendar className="absolute -right-4 -bottom-4 w-24 h-24 text-primary/10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Leave balances</h3>
            <Link
              href="/leave"
              className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {leaveBalances.map((lb: any, i: number) => (
              <div key={i} className="bg-muted/30 border border-border p-3 rounded-xl text-center">
                <p className="text-sm font-black text-foreground leading-none">{lb.remaining}</p>
                <p className="text-[7px] font-black text-muted-foreground uppercase mt-1 tracking-tighter truncate">
                  {lb.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">This month</p>
          <p>
            <span className="font-semibold text-foreground">{stats.presentDays}</span> present days ·{' '}
            <span className="font-semibold text-foreground">{stats.leaveDays}</span> leave days ·{' '}
            <span className="font-semibold text-foreground">{stats.pendingLeaves}</span> pending leave
            {typeof stats.lateDays === 'number' ? (
              <>
                {' '}
                · <span className="font-semibold text-foreground">{stats.lateDays}</span> late
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Off-duty today</h3>
          <div className="flex flex-wrap gap-2">
            {onLeaveToday.length > 0 ? (
              onLeaveToday.map((emp: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/5 border border-rose-500/10 rounded-xl"
                >
                  <div className="w-6 h-6 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-[8px] shrink-0">
                    {emp.avatar || emp.name?.[0]}
                  </div>
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-tight whitespace-nowrap">
                    {emp.name}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 italic">
                Full house — everyone is in today.
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border bg-muted/20 overflow-x-auto no-scrollbar">
            {['birthdays', 'anniversaries', 'joinees'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[120px] px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-primary text-primary bg-background'
                    : 'border-transparent text-muted-foreground hover:bg-background/50'
                }`}
              >
                {tab === 'birthdays' ? `${birthdays.length} Birthdays` : `0 ${tab}`}
              </button>
            ))}
          </div>

          <div className="p-4 lg:p-6">
            {activeTab === 'birthdays' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-4 border-l-2 border-primary pl-2">
                    Today
                  </h4>
                  <div className="space-y-4">
                    {birthdays.length > 0 ? (
                      birthdays.map((b: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-black text-sm border border-cyan-500/20 shrink-0">
                            {b.name?.[0]}
                          </div>
                          <div>
                            <p className="text-xs font-black text-foreground uppercase tracking-tight">{b.name}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-bold uppercase italic opacity-60">
                        No birthdays today
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-4 border-l-2 border-primary pl-2">
                    Upcoming
                  </h4>
                  <div className="space-y-4">
                    {upcomingBirthdays.length > 0 ? (
                      upcomingBirthdays.slice(0, 3).map((ub: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center font-black text-[10px] text-muted-foreground shrink-0">
                            {ub.name?.[0]}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-tight">{ub.name}</p>
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{ub.date}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-bold uppercase italic opacity-60">
                        None in the next 30 days
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
