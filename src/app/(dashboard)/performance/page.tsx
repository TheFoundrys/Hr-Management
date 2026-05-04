'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy, Target, TrendingUp, Users, 
  Plus, Calendar, Search, Star,
  CheckCircle2, AlertCircle, BarChart3, Loader2, XCircle
} from 'lucide-react';

export default function PerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/performance');
        const json = await res.json();
        if (json.success) setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  const stats = data?.stats || { avg_rating: 0, completed_reviews: 0, total_reviews: 0 };
  const reviews = data?.reviews || [];

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tighter flex items-center gap-4">
            <Trophy size={40} className="text-primary" /> Performance Review
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
            Evaluate and track institutional workforce excellence
          </p>
        </div>
        <button className="flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
          <Plus size={16} strokeWidth={3} /> Initiate New Cycle
        </button>
      </header>

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Avg Rating', value: Number(stats.avg_rating || 0).toFixed(1), icon: Star, color: 'text-amber-500', trend: 'Global mean score' },
           { label: 'Completion', value: stats.total_reviews > 0 ? `${Math.round((stats.completed_reviews / stats.total_reviews) * 100)}%` : '0%', icon: Target, color: 'text-primary', trend: `${stats.total_reviews - stats.completed_reviews} reviews pending` },
           { label: 'Review Pool', value: stats.total_reviews, icon: TrendingUp, color: 'text-emerald-500', trend: 'Total active reviews' }
         ].map((kpi, i) => (
           <div key={i} className="bg-card border border-border p-8 shadow-sm group hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                 <kpi.icon size={18} className={kpi.color} />
              </div>
              <div className="flex items-end gap-3">
                 <p className="text-4xl font-black text-foreground tracking-tighter">{kpi.value}</p>
                 <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">{kpi.trend}</span>
              </div>
           </div>
         ))}
      </div>

      {/* Review Queue */}
      <div className="bg-card border border-border rounded-xl shadow-2xl">
         <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 bg-muted/30 border border-border px-4 py-2.5 rounded-xl flex-1 max-w-md shadow-inner">
               <Search size={16} className="text-muted-foreground" />
               <input type="text" placeholder="Search employee or cycle..." className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-tight w-full" />
            </div>
            <div className="flex gap-2">
               <button className="px-4 py-2 bg-muted text-[10px] font-black uppercase tracking-widest border border-border">Filter</button>
               <button className="px-4 py-2 bg-muted text-[10px] font-black uppercase tracking-widest border border-border flex items-center gap-2">
                  <BarChart3 size={14} /> Analytics
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-border">
                     <th className="px-8 py-5">Employee Identity</th>
                     <th className="px-8 py-5">Review Cycle</th>
                     <th className="px-8 py-5">Performance Score</th>
                     <th className="px-8 py-5">Status</th>
                     <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  {reviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest italic">
                        No active performance reviews found in the registry.
                      </td>
                    </tr>
                  ) : reviews.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-all group">
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-primary/10 flex items-center justify-center font-black text-primary text-xs">
                                {r.employee_name.split(' ').map((n: string) => n[0]).join('')}
                             </div>
                             <div>
                                <p className="font-black text-xs text-foreground uppercase">{r.employee_name}</p>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{r.employee_serial}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-6 text-xs font-bold text-foreground uppercase">{r.cycle_name}</td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                             <div className="flex-1 h-1.5 bg-muted rounded-xl overflow-hidden max-w-[80px]">
                                <div className="h-full bg-primary" style={{ width: `${(Number(r.score) / 5) * 100}%` }} />
                             </div>
                             <span className="text-[10px] font-black">{r.score > 0 ? r.score : 'N/A'}</span>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <span className={`text-[9px] px-3 py-1 rounded-xl font-black uppercase tracking-widest ${
                            r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 
                            r.status === 'in_progress' ? 'bg-amber-500/10 text-amber-600' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {r.status}
                          </span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => setSelectedReview(r)}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all"
                          >
                             View Details
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* My Goals Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
           <Target size={24} className="text-primary" />
           <h2 className="text-xl font-black text-foreground uppercase tracking-tight">My Active Goals</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {(data?.goals || []).length === 0 ? (
             <div className="col-span-2 p-10 bg-muted/20 border border-border text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                No active goals assigned to your profile yet.
             </div>
           ) : (data.goals || []).map((goal: any) => (
             <div key={goal.id} className="bg-card border border-border p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                   <div className="flex-1">
                      <h3 className="text-xs font-black text-foreground uppercase tracking-tight">{goal.title}</h3>
                      <button 
                        onClick={() => setEditingGoal(goal)}
                        className="text-[8px] font-black text-primary uppercase mt-1 hover:underline"
                      >
                         Edit Details
                      </button>
                   </div>
                   <span className="text-[8px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 font-black uppercase tracking-widest">
                      Priority: {goal.priority}
                   </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">{goal.description}</p>
                
                <div className="space-y-2">
                   <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      <span>Progress</span>
                      <span>{goal.progress}%</span>
                   </div>
                   <input 
                     type="range" 
                     min="0" 
                     max="100" 
                     value={goal.progress} 
                     onChange={async (e) => {
                        const newProgress = parseInt(e.target.value);
                        // Optimistic UI update
                        const newData = { ...data, goals: data.goals.map((g: any) => g.id === goal.id ? { ...g, progress: newProgress } : g) };
                        setData(newData);
                        
                        await fetch('/api/performance/goals', {
                          method: 'PATCH',
                          body: JSON.stringify({ goalId: goal.id, progress: newProgress })
                        });
                     }}
                     className="w-full h-1 bg-muted appearance-none cursor-pointer accent-primary"
                   />
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase">
                   <Calendar size={10} />
                   Deadline: {new Date(goal.target_date).toLocaleDateString()}
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-card border border-border w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300">
              <div className="p-8 border-b border-border flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter">Performance Detail</h2>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{selectedReview.cycle_name}</p>
                 </div>
                 <button onClick={() => setSelectedReview(null)} className="text-muted-foreground hover:text-foreground">
                    <XCircle size={24} />
                 </button>
              </div>
              
              <div className="p-8 space-y-8">
                 <div className="flex items-center gap-6 p-6 bg-muted/30 border border-border">
                    <div className="w-20 h-20 bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                       <span className="text-3xl font-black text-primary">{selectedReview.score}</span>
                       <span className="text-[8px] font-black uppercase text-muted-foreground">Final Score</span>
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-foreground uppercase">{selectedReview.employee_name}</h3>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Employee ID: {selectedReview.employee_serial}</p>
                       <div className="mt-3 flex gap-2">
                          <span className="text-[8px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black uppercase tracking-widest">
                             Status: {selectedReview.status}
                          </span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Feedback Summary</h4>
                    <p className="text-xs leading-relaxed text-foreground font-medium italic">
                       "{selectedReview.feedback_summary || 'No detailed feedback provided for this cycle.'}"
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-border bg-muted/20">
                       <h5 className="text-[9px] font-black text-muted-foreground uppercase mb-2">Key Strengths</h5>
                       <p className="text-[10px] font-bold text-foreground">{selectedReview.strengths || 'N/A'}</p>
                    </div>
                    <div className="p-4 border border-border bg-muted/20">
                       <h5 className="text-[9px] font-black text-muted-foreground uppercase mb-2">Growth Areas</h5>
                       <p className="text-[10px] font-bold text-foreground">{selectedReview.improvements || 'N/A'}</p>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-muted/30 border-t border-border flex justify-end">
                 <button 
                   onClick={() => setSelectedReview(null)}
                   className="px-8 py-3 bg-foreground text-background font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all"
                 >
                    Close Registry Record
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-card border border-border w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
              <div className="p-8 border-b border-border flex justify-between items-center">
                 <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Edit Goal Details</h2>
                 <button onClick={() => setEditingGoal(null)} className="text-muted-foreground hover:text-foreground">
                    <XCircle size={20} />
                 </button>
              </div>
              
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const title = formData.get('title') as string;
                  const description = formData.get('description') as string;
                  
                  // Update locally
                  setData({
                    ...data,
                    goals: data.goals.map((g: any) => g.id === editingGoal.id ? { ...g, title, description } : g)
                  });
                  setEditingGoal(null);
                  
                  await fetch('/api/performance/goals', {
                    method: 'PATCH',
                    body: JSON.stringify({ goalId: editingGoal.id, title, description })
                  });
                }}
                className="p-8 space-y-6"
              >
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Goal Title</label>
                    <input 
                      name="title"
                      defaultValue={editingGoal.title}
                      className="w-full bg-muted/30 border border-border p-3 text-xs font-bold uppercase tracking-tight outline-none focus:border-primary transition-all"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Description</label>
                    <textarea 
                      name="description"
                      defaultValue={editingGoal.description}
                      rows={4}
                      className="w-full bg-muted/30 border border-border p-3 text-xs font-bold uppercase tracking-tight outline-none focus:border-primary transition-all resize-none"
                    />
                 </div>
                 
                 <div className="pt-4 flex justify-end gap-4">
                    <button 
                      type="button"
                      onClick={() => setEditingGoal(null)}
                      className="px-6 py-3 bg-muted text-muted-foreground font-black text-[10px] uppercase tracking-widest border border-border"
                    >
                       Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-8 py-3 bg-primary text-secondary font-black text-[10px] uppercase tracking-widest hover:opacity-90 shadow-lg shadow-primary/20"
                    >
                       Update Goal
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
