'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, User, BookOpen, 
  Plus, Loader2, Download, Printer, Filter, ChevronRight,
  Settings, CheckCircle2, AlertCircle
} from 'lucide-react';
import { TimetableGrid } from '@/components/scheduling/TimetableGrid';

export default function SchedulingPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [days, setDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [timeSlots, setTimeSlots] = useState<string[]>(['09:00', '10:00', '11:00', '12:00', '14:00', '15:00']);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch available Slots to dynamically build the grid
      const sRes = await fetch('/api/admin/scheduling/slots');
      const sData = await sRes.json();
      if (sData.success && sData.slots?.length > 0) {
        const uniqueDays = Array.from(new Set(sData.slots.map((s: any) => s.day_of_week))) as string[];
        const uniqueTimes = Array.from(new Set(sData.slots.map((s: any) => s.start_time.substring(0, 5)))) as string[];
        
        // Sort days logically
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        uniqueDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
        uniqueTimes.sort();

        setDays(uniqueDays);
        setTimeSlots(uniqueTimes);
      }

      // 2. Fetch Groups
      const gRes = await fetch('/api/admin/scheduling/groups');
      const gData = await gRes.json();
      if (gData.success) {
        setGroups(gData.groups);
        if (gData.groups.length > 0) {
          setSelectedGroup(gData.groups[0].id);
          fetchTimetable(gData.groups[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (groupId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/scheduling/timetable?groupId=${groupId}`);
      const data = await res.json();
      if (data.success) setEntries(data.entries);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedGroup) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/scheduling/generate', {
        method: 'POST',
        body: JSON.stringify({ groupId: selectedGroup })
      });
      const data = await res.json();
      if (data.success) fetchTimetable(selectedGroup);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/admin/scheduling/publish', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Schedule broadcast successful! All units notified.');
        fetchTimetable(selectedGroup);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Class Scheduling
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Automated academic timetable management system.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !selectedGroup}
            className="flex items-center justify-center gap-2 bg-primary text-secondary px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            Generate Schedule
          </button>
          <button className="flex items-center justify-center gap-2 bg-muted hover:bg-accent px-4 py-2.5 rounded-lg font-bold text-sm transition-all border">
            <Download size={16} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ChevronRight size={20} className="text-primary" />
                  Execution Grid
                </h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Viewing scheduled sessions for the selected group</p>
              </div>

              <div className="flex items-center gap-2 min-w-[250px]">
                <Filter size={16} className="text-muted-foreground" />
                <select 
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    fetchTimetable(e.target.value);
                  }}
                  className="w-full bg-muted/40 border rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                >
                  <option value="">Select Group...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} - {g.course_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="h-[400px] flex flex-col items-center justify-center opacity-40 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <span className="text-sm font-bold uppercase tracking-widest animate-pulse">Loading Schedule Data...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl gap-4 text-muted-foreground">
                <AlertCircle size={40} className="opacity-20" />
                <p className="text-sm font-bold opacity-40">No entries found for this group.</p>
                <button onClick={handleGenerate} className="text-primary font-bold text-xs hover:underline uppercase tracking-widest">Generate Now</button>
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

        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground border-b pb-4">Configuration Modules</h3>
            
            <div className="space-y-3">
              {[
                { title: 'Register Units', path: '/admin/scheduling/entities', icon: Plus },
                { title: 'Map Subject Groups', path: '/admin/scheduling/entities', icon: BookOpen },
                { title: 'Faculty Deployment', path: '/employees', icon: User },
                { title: 'Room Allocation', path: '/admin/scheduling/entities', icon: MapPin },
              ].map((link, idx) => (
                <a 
                  key={idx}
                  href={link.path}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-primary/5 hover:border-primary/20 border transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <link.icon size={18} className="text-primary/60 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-bold truncate group-hover:text-primary transition-colors">{link.title}</span>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </a>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold">
              <CheckCircle2 size={18} />
              <span className="text-sm">Broadcast Ready</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Once the schedule is verified, broadcast the timetable to all assigned faculty units and students.
            </p>
            <button 
              onClick={handleBroadcast}
              disabled={isBroadcasting}
              className="w-full bg-primary text-secondary py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isBroadcasting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isBroadcasting ? 'Broadcasting...' : 'Broadcast All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
