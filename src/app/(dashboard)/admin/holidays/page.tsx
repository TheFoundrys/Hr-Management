'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Loader2, 
  Search,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('public');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/admin/holidays');
      const data = await res.json();
      if (data.success) {
        setHolidays(data.holidays);
      }
    } catch (err) {
      console.error('Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, type })
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Holiday added successfully!' });
        setName('');
        setDate('');
        setType('public');
        fetchHolidays();
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add holiday' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchHolidays();
      }
    } catch (err) {
      alert('Failed to delete holiday');
    }
  };

  const filteredHolidays = holidays.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center bg-card border border-border p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Holiday Management</h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Configure Institutional Calendar</p>
        </div>
        <button 
          onClick={() => {
            setMessage(null);
            setIsModalOpen(true);
          }}
          className="px-6 py-2.5 bg-primary text-secondary rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] transition-all"
        >
          <Plus size={14} /> Add Holiday
        </button>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search holidays..."
                className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-2xl text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full border-collapse">
              <thead>
                 <tr className="bg-muted/30 border-b border-border">
                    <th className="px-8 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Holiday Name</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-border">
                 {loading ? (
                   <tr>
                     <td colSpan={4} className="px-8 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                     </td>
                   </tr>
                 ) : filteredHolidays.length > 0 ? filteredHolidays.map((holiday) => (
                   <tr key={holiday.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-8 py-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/5 text-primary rounded-lg"><CalendarIcon size={16} /></div>
                            <span className="text-sm font-bold text-foreground uppercase">{holiday.name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-4 text-sm font-medium text-muted-foreground">
                         {new Date(holiday.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-8 py-4">
                         <span className="px-3 py-1 bg-muted border border-border rounded-lg text-[9px] font-bold text-foreground uppercase tracking-widest">
                            {holiday.type}
                         </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                         <button 
                           onClick={() => handleDeleteHoliday(holiday.id)}
                           className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                         >
                            <Trash2 size={16} />
                         </button>
                      </td>
                   </tr>
                 )) : (
                   <tr>
                     <td colSpan={4} className="px-8 py-12 text-center text-sm text-muted-foreground font-medium italic">
                        No holidays found.
                     </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background border border-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col scale-100 animate-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                   <CalendarIcon size={20} />
                 </div>
                 <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Add New Holiday</h2>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                 <X size={20} />
               </button>
            </div>

            <form onSubmit={handleAddHoliday} className="p-8 space-y-6">
               {message && (
                 <div className={`p-4 rounded-2xl flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                   {message.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                   <p className="text-[10px] font-black uppercase tracking-tight">{message.text}</p>
                 </div>
               )}

               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Holiday Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-5 py-3.5 bg-muted/30 border border-border rounded-2xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-medium"
                      placeholder="e.g. Independence Day"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-5 py-3.5 bg-muted/30 border border-border rounded-2xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-medium"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Holiday Type</label>
                    <select 
                      className="w-full px-5 py-3.5 bg-muted/30 border border-border rounded-2xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-medium appearance-none"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="public">Public Holiday</option>
                      <option value="restricted">Restricted Holiday</option>
                      <option value="institutional">Institutional Holiday</option>
                    </select>
                  </div>
               </div>

               <button 
                 type="submit"
                 disabled={submitting}
                 className="w-full py-4 bg-primary text-secondary rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
               >
                 {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={14} />}
                 Add Holiday to Calendar
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
