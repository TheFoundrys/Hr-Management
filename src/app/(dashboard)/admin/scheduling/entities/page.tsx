'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, BookOpen, Clock,
  Layers, MapPin, Loader2, Save, X, BoxSelect,
  Sparkles, Zap, ShieldCheck, Activity, Database, Building2, CheckCircle2, ChevronRight
} from 'lucide-react';
import { 
  GET_departments, GET_courses, GET_subjects, GET_groups,
  POST_department, POST_course, POST_subject, POST_group,
  DELETE_subject 
} from '@/lib/scheduling/apiHandlers';

export default function SchedulingEntitiesPage() {
  const [activeTab, setActiveTab] = useState<'departments' | 'courses' | 'groups' | 'subjects' | 'rooms' | 'slots'>('departments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [d, c, g, s, r, sl] = await Promise.all([
        GET_departments(), GET_courses(), GET_groups(), GET_subjects(),
        fetch('/api/admin/scheduling/rooms').then(res => res.json()),
        fetch('/api/admin/scheduling/slots').then(res => res.json())
      ]);
      setDepartments(d.departments || d);
      setCourses(c.courses || c);
      setGroups(g.groups || g);
      setSubjects(s.subjects || s);
      setRooms(r.rooms || []);
      setSlots(sl.slots || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (activeTab === 'departments') res = await POST_department(formData);
      else if (activeTab === 'courses') res = await POST_course(formData);
      else if (activeTab === 'groups') res = await POST_group(formData);
      else if (activeTab === 'subjects') res = await POST_subject(formData);
      else if (activeTab === 'rooms') {
         res = await fetch('/api/admin/scheduling/rooms', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(formData)
         }).then(r => r.json());
      } else if (activeTab === 'slots') {
         res = await fetch('/api/admin/scheduling/slots', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(formData)
         }).then(r => r.json());
      }

      if (res && res.success) {
        setShowModal(false);
        setFormData({});
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            Infrastructure Registry
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Manage hierarchical entities for academic scheduling.</p>
        </div>
        
        <button 
          onClick={() => { setFormData({}); setShowModal(true); }}
          className="flex items-center justify-center gap-3 bg-primary text-secondary px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-sm"
        >
          <Plus size={20} />
          Register {activeTab.slice(0, -1)}
        </button>
      </header>

      {/* Stats Quickbar */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
         {[
           { label: 'Depts', count: departments.length, icon: Building2, color: 'primary' },
           { label: 'Courses', count: courses.length, icon: CheckCircle2, color: 'emerald' },
           { label: 'Groups', count: groups.length, icon: Layers, color: 'indigo' },
           { label: 'Subjects', count: subjects.length, icon: BookOpen, color: 'amber' },
           { label: 'Rooms', count: rooms.length, icon: MapPin, color: 'rose' },
           { label: 'Slots', count: slots.length, icon: Clock, color: 'sky' },
         ].map((stat, i) => (
           <div key={i} className="bg-card border p-4 rounded-xl shadow-sm flex items-center gap-3 hover:bg-primary/5 transition-all">
              <div className={`p-2.5 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500`}>
                 <stat.icon size={18} />
              </div>
              <div>
                 <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-60 mb-0.5">{stat.label}</div>
                 <div className="text-sm font-bold">{stat.count}</div>
              </div>
           </div>
         ))}
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden min-h-[500px]">
        <div className="flex border-b bg-muted/30 overflow-x-auto scrollbar-hide">
          {(['departments', 'courses', 'groups', 'subjects', 'rooms', 'slots'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex-1 px-8 py-5 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap
                ${activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary animate-in slide-in-from-left duration-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {loading ? (
            <div className="h-[400px] flex flex-col items-center justify-center opacity-40 gap-4">
               <Loader2 className="w-10 h-10 animate-spin text-primary" />
               <span className="text-sm font-bold uppercase tracking-widest animate-pulse text-muted-foreground">Indexing Data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {activeTab === 'departments' && departments.map(d => (
                 <EntityCard key={d.id} title={d.name} subtitle={`DEP-NODE: ${d.id.slice(0, 8)}`} icon={Building2} />
               ))}
               {activeTab === 'courses' && courses.map(c => (
                 <EntityCard key={c.id} title={c.name} subtitle={`SEM ${c.semester} • YR ${c.year}`} icon={CheckCircle2} />
               ))}
               {activeTab === 'groups' && groups.map(g => (
                 <EntityCard key={g.id} title={g.name} subtitle={`NODE: ${g.course_name} • SEM ${g.semester}`} icon={Layers} />
               ))}
               {activeTab === 'subjects' && subjects.map(s => (
                 <EntityCard key={s.id} title={s.name} subtitle={`${s.course_name} • ${s.hours_per_week}H LOAD`} icon={BookOpen} />
               ))}
               {activeTab === 'rooms' && rooms.map(r => (
                 <EntityCard key={r.id} title={r.room_number} subtitle={`CAPACITY: ${r.capacity} PAX`} icon={MapPin} />
               ))}
               {activeTab === 'slots' && slots.map(sl => (
                 <EntityCard key={sl.id} title={`${sl.start_time} - ${sl.end_time}`} subtitle={sl.day_of_week} icon={Clock} />
               ))}
               
               {/* Empty State */}
               {((activeTab === 'departments' && departments.length === 0) ||
                 (activeTab === 'courses' && courses.length === 0) ||
                 (activeTab === 'groups' && groups.length === 0) ||
                 (activeTab === 'subjects' && subjects.length === 0) ||
                 (activeTab === 'rooms' && rooms.length === 0) ||
                 (activeTab === 'slots' && slots.length === 0)) && (
                 <div className="col-span-full h-[300px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <Database size={40} className="mb-4 opacity-20" />
                    <span className="text-sm font-bold uppercase tracking-widest">No entries registered in this node</span>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-black/40 animate-in fade-in duration-300">
           <div className="bg-card w-full max-w-lg rounded-2xl border shadow-xl p-10 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors">
                 <X size={20} />
              </button>
              
              <h3 className="text-xl font-bold mb-8 uppercase tracking-widest text-foreground">Register {activeTab.slice(0, -1)}</h3>

              <form onSubmit={handleSave} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Name / Label</label>
                    <input 
                      required
                      className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                      placeholder="Enter information..."
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                 </div>

                 {activeTab === 'courses' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Parent Department</label>
                       <select 
                         required
                         className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all appearance-none"
                         onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                       >
                          <option value="">Select Parent...</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                    </div>
                 )}

                 {activeTab === 'groups' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Program Node</label>
                          <select 
                            required
                            className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all appearance-none"
                            onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                          >
                             <option value="">Select Parent...</option>
                             {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Active Semester</label>
                          <input 
                            required type="number"
                            className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                            placeholder="e.g. 5"
                            onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                          />
                       </div>
                    </div>
                 )}

                 {activeTab === 'subjects' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Program Node</label>
                          <select 
                            required
                            className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all appearance-none"
                            onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                          >
                             <option value="">Select Parent...</option>
                             {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Spatial Load (H/W)</label>
                          <input 
                            required type="number"
                            className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                            placeholder="e.g. 4"
                            onChange={(e) => setFormData({ ...formData, hours_per_week: parseInt(e.target.value) })}
                          />
                       </div>
                    </div>
                 )}

                 {activeTab === 'rooms' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Room Identifier</label>
                          <input 
                            required
                            className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                            placeholder="e.g. CR-101"
                            onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Seat Capacity</label>
                          <input 
                            required type="number"
                            className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                            placeholder="e.g. 60"
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                          />
                       </div>
                    </div>
                 )}

                 {activeTab === 'slots' && (
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Day of Cycle</label>
                          <select 
                            required
                            className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all appearance-none"
                            onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                          >
                             <option value="">Select Day...</option>
                             {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                               <option key={day} value={day}>{day}</option>
                             ))}
                          </select>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Commencement</label>
                             <input 
                               required type="time"
                               className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                               onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Conclusion</label>
                             <input 
                               required type="time"
                               className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                               onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                             />
                          </div>
                       </div>
                    </div>
                 )}

                 <button 
                   disabled={saving}
                   className="w-full bg-primary text-secondary py-5 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                 >
                   {saving ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Confirm Registration'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

function EntityCard({ title, subtitle, icon: Icon }: any) {
  return (
    <div className="bg-muted/10 border p-6 rounded-2xl hover:bg-primary/[0.02] hover:border-primary/20 group transition-all duration-300 relative overflow-hidden">
       <div className="flex flex-col gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-white/5 border flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm">
             <Icon size={20} />
          </div>
          <div>
             <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{title}</h3>
             <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-60 mt-0.5">{subtitle}</p>
          </div>
       </div>
       <div className="absolute top-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><Edit2 size={14} /></button>
          <button className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
       </div>
    </div>
  );
}
