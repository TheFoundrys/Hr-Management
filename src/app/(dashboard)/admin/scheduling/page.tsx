'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, BookOpen, Plus, Loader2, Filter, Settings, ShieldCheck, Activity, Building2, Layers, Trash2, User } from 'lucide-react';
import { TimetableGrid } from '@/components/scheduling/TimetableGrid';

export default function SchedulingPage() {
  const [view, setView] = useState<'grid' | 'infra'>('grid');
  const [subTab, setSubTab] = useState('departments');
  const [data, setData] = useState<any>({});
  const [entries, setEntries] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [days, setDays] = useState(['Monday','Tuesday','Wednesday','Thursday','Friday']);
  const [slots, setSlots] = useState(['09:00','10:00','11:00','12:00','14:00','15:00']);

  const api = (url: string, m='GET', b?: any) => fetch(url, {method:m, headers:{'Content-Type':'application/json'}, body:b?JSON.stringify(b):null}).then(r=>r.json());

  const refreshInfras = () => {
    setLoading(true);
    const get = (u:string) => fetch(u).then(r=>r.json());
    Promise.all([get('/api/admin/scheduling/groups'), get('/api/admin/scheduling/courses'), get('/api/admin/scheduling/slots'), get('/api/admin/scheduling/rooms'), get('/api/admin/scheduling/departments'), get('/api/admin/scheduling/subjects')])
      .then(([g, c, s, r, d, sub]) => {
        const _data = { groups:g.groups||[], courses:c.courses||[], slots:s.slots||[], rooms:r.rooms||[], departments:d.departments||d||[], subjects:sub.subjects||sub||[] };
        setData(_data);
        if (_data.slots.length) {
          setDays(Array.from(new Set(_data.slots.map((x:any)=>x.day_of_week))));
          setSlots(Array.from(new Set(_data.slots.map((x:any)=>x.start_time.slice(0,5)))).sort() as any);
        }
        if (_data.groups.length && !selectedGroup) { setSelectedGroup(_data.groups[0].id); fetchGrid(_data.groups[0].id); }
      }).finally(() => setLoading(false));
  };

  const fetchGrid = (id: string) => { if (!id) return; setLoading(true); api(`/api/admin/scheduling/timetable?groupId=${id}`).then(d => setEntries(d.entries||[])).finally(()=>setLoading(false)); };
  useEffect(refreshInfras, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    const urls:any = { departments:'/api/admin/scheduling/departments', courses:'/api/admin/scheduling/courses', groups:'/api/admin/scheduling/groups', subjects:'/api/admin/scheduling/subjects', rooms:'/api/admin/scheduling/rooms', slots:'/api/admin/scheduling/slots' };
    if ((await api(urls[subTab], 'POST', form)).success) { setModal(false); setForm({}); refreshInfras(); }
  };

  return (
    <div className="max-w-auto space-y-8 animate-fade-in pb-20">
      <header className="flex justify-between items-center pb-6 border-b border-surface-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Calendar className="text-primary-500" /> Academic Schedule</h1>
          <p className="text-surface-400 text-xs font-mono mt-1 uppercase tracking-widest leading-none">Automated Timetable & Infrastructure</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-surface-900 p-1 rounded-xl border border-surface-800 flex">
            {['grid', 'infra'].map(v => (
              <button key={v} onClick={() => setView(v as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-500 hover:text-surface-300'}`}>{v}</button>
            ))}
          </div>
          {view === 'grid' ? (
            <button key="gen" onClick={() => api('/api/admin/scheduling/generate', 'POST', {groupId:selectedGroup}).then(()=>fetchGrid(selectedGroup))} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary-500 shadow-lg shadow-primary-500/10 transition-colors"><Settings size={14}/> Generate</button>
          ) : (
            <button key="add" onClick={() => {setForm({}); setModal(true);}} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary-500 shadow-lg shadow-primary-500/10 transition-colors"><Plus size={14}/> Add {subTab.slice(0,-1)}</button>
          )}
        </div>
      </header>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400">Timetable Grid</h2>
                <select value={selectedGroup} onChange={e => {setSelectedGroup(e.target.value); fetchGrid(e.target.value);}} className="bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:border-primary-500 outline-none w-full min-w-0 max-w-full sm:max-w-xs sm:w-auto">
                   <option value="">Select Group...</option>
                   {data.groups?.map((g:any) => <option key={g.id} value={g.id}>{g.name} - {g.course_name}</option>)}
                </select>
             </div>
             {loading ? <div className="h-96 flex justify-center items-center"><Loader2 className="animate-spin text-primary-500" /></div> : <TimetableGrid entries={entries} days={days} timeSlots={slots} />}
          </div>
          <div className="space-y-6">
             <div className="bg-primary-600/5 border border-primary-500/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-primary-400 font-black text-xs uppercase tracking-widest"><ShieldCheck size={16}/> Broadcast Ready</div>
                <p className="text-[11px] text-surface-500 leading-relaxed font-medium">Once verified, deploy the timetable to all student and faculty nodes.</p>
                <button onClick={() => api('/api/admin/scheduling/publish', 'POST').then(()=>alert('Broadcast Success'))} className="w-full bg-primary-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-500 transition-all shadow-lg shadow-primary-500/10">Publish Schedule</button>
             </div>
             <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800 pb-3">Quick Navigation</h3>
                {[{l:'Subjects',i:BookOpen}, {l:'Venues',i:MapPin}, {l:'Faculty',i:User}].map((x:any,i)=> (
                  <button key={i} onClick={()=>setView('infra')} className="w-full flex justify-between items-center p-3 rounded-xl bg-surface-950/50 border border-surface-800 hover:border-primary-500/50 transition-colors group"><div className="flex items-center gap-3"><x.i size={14} className="text-surface-500 group-hover:text-primary-400" /><span className="text-xs font-bold text-surface-300 group-hover:text-white">{x.l}</span></div><Activity size={12} className="text-surface-600" /></button>
                ))}
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex border-b border-surface-800 gap-8 overflow-x-auto pb-px">
            {['departments','courses','groups','subjects','rooms','slots'].map(id => (
              <button key={id} onClick={() => setSubTab(id)} className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${subTab === id ? 'text-primary-500' : 'text-surface-500 hover:text-surface-300'}`}>
                {id} {subTab === id && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-primary-500 rounded-full" />}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data[subTab]?.map((item:any, i:number) => (
              <div key={i} className="bg-surface-900 border border-surface-800 p-5 rounded-2xl hover:border-primary-500/50 group transition-all">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-surface-950 rounded-xl flex items-center justify-center text-primary-500 border border-surface-800"><Building2 size={18}/></div>
                  <button onClick={()=>api(`${subTab==='subjects'?'/api/admin/scheduling/subjects':'#'}/${item.id}`,'DELETE').then(refreshInfras)} className="text-surface-600 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"><Trash2 size={14}/></button>
                </div>
                <h4 className="font-bold text-white text-sm mt-4 truncate">{item.name || item.room_number || `${item.start_time} - ${item.end_time}`}</h4>
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mt-1 truncate">{item.course_name || item.day_of_week || `NODE ${item.id?.slice(0,6)}`}</p>
              </div>
            ))}
            {!data[subTab]?.length && <div className="col-span-full p-24 text-center text-surface-600 italic border-2 border-dashed border-surface-800 rounded-3xl">Registry empty for this node.</div>}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-surface-900 w-full max-w-md rounded-3xl border border-surface-800 p-8 shadow-2xl relative">
              <h3 className="text-lg font-black uppercase tracking-widest text-white mb-6">Register {subTab.slice(0,-1)}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                 <input placeholder="Identifier Name" required value={form.name||''} onChange={e=>setForm({...form, name:e.target.value})} className="w-full bg-surface-950 border border-surface-800 p-4 rounded-xl text-sm text-white focus:border-primary-500 outline-none" />
                 {subTab==='courses' && <select required className="w-full bg-surface-950 border border-surface-800 p-4 rounded-xl text-sm text-white outline-none" onChange={e=>setForm({...form, department_id:e.target.value})}><option value="">Select Dept</option>{data.departments.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                 {['groups','subjects'].includes(subTab) && <select required className="w-full bg-surface-950 border border-surface-800 p-4 rounded-xl text-sm text-white outline-none" onChange={e=>setForm({...form, course_id:e.target.value})}><option value="">Select Course</option>{data.courses.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
                 {subTab==='subjects' && <input type="number" placeholder="Weekly Load (Hours)" required onChange={e=>setForm({...form, hours_per_week:parseInt(e.target.value)})} className="w-full bg-surface-950 border border-surface-800 p-4 rounded-xl text-sm text-white outline-none" />}
                 <div className="flex gap-3 pt-4">
                    <button type="button" onClick={()=>setModal(false)} className="flex-1 bg-surface-800 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                    <button type="submit" className="flex-1 bg-primary-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest">Register</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
