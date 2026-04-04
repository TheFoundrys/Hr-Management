'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, User, BookOpen, 
  Loader2, Download, Printer, Filter, ChevronRight,
  Sparkles, Activity, Globe, Zap, Cpu
} from 'lucide-react';
import { TimetableGrid } from '@/components/scheduling/TimetableGrid';

export default function FacultySchedulePage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const [days, setDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [timeSlots, setTimeSlots] = useState<string[]>(['09:00', '10:00', '11:00', '12:00', '14:00', '15:00']);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch available Slots to dynamically build the grid
      const sRes = await fetch('/api/admin/scheduling/slots');
      const sData = await sRes.json();
      if (sData.success && sData.slots?.length > 0) {
        const uniqueDays = Array.from(new Set(sData.slots.map((s: any) => s.day_of_week))) as string[];
        const uniqueTimes = Array.from(new Set(sData.slots.map((s: any) => s.start_time.substring(0, 5)))) as string[];
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        uniqueDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
        uniqueTimes.sort();
        setDays(uniqueDays);
        setTimeSlots(uniqueTimes);
      }

      // 2. Fetch Profile and Timetable
      const pRes = await fetch('/api/employees/me');
      const pData = await pRes.json();
      if (pData.success) {
        setProfile(pData.employee);
        const tRes = await fetch(`/api/admin/scheduling/timetable?facultyId=${pData.employee.id}`);
        const tData = await tRes.json();
        if (tData.success) setEntries(tData.entries);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            My Schedule
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Your personalized teaching timetable.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center gap-2 bg-muted hover:bg-accent border px-4 py-2.5 rounded-lg text-sm font-bold transition-all">
            <Download size={18} className="text-primary" /> Export PDF
          </button>
          <button className="flex items-center justify-center gap-2 bg-primary text-secondary px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-sm">
            <Printer size={18} /> Print View
          </button>
        </div>
      </header>

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'Assigned Faculty', value: `${profile.first_name} ${profile.last_name}`, sub: profile.designation_name, icon: User, color: 'primary' },
             { label: 'Weekly Load', value: `${entries.length} Sessions`, sub: 'Total assigned periods', icon: Activity, color: 'emerald' },
             { label: 'Academic Term', value: 'Term 2026-X', sub: 'Active period', icon: Globe, color: 'indigo' },
           ].map((stat, i) => (
             <div key={i} className="bg-card border p-6 rounded-xl shadow-sm flex items-center gap-4 group hover:bg-primary/5 transition-all">
                <div className={`p-4 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500 transition-transform`}>
                   <stat.icon size={24} />
                </div>
                <div>
                   <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-60 mb-0.5">{stat.label}</div>
                   <h3 className="text-lg font-bold">{stat.value}</h3>
                   <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5 tracking-wider">{stat.sub}</p>
                </div>
             </div>
           ))}
        </div>
      )}

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden p-6 min-h-[500px]">
        {loading ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4 opacity-40">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <span className="text-sm font-bold uppercase tracking-widest animate-pulse text-muted-foreground">Mapping Schedule Grid...</span>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <TimetableGrid 
              entries={entries} 
              days={days} 
              timeSlots={timeSlots} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
