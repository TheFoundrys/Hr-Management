'use client';
import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Building, Briefcase, Calendar, CreditCard, ShieldAlert, Loader2, CheckCircle2, Lock, Globe, User, MessageSquare, AlertCircle, X, Send } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestCategory, setRequestCategory] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetch('/api/employees/me').then(r => r.json()).then(d => { if (d.success) setProfile(d.employee); }).finally(() => setLoading(false));
  }, []);

  const openRequestModal = (category: string) => {
    setRequestCategory(category);
    setRequestDescription('');
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!requestDescription) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/support/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: requestCategory.toLowerCase(), description: requestDescription })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Your request has been submitted to the admin.' });
        setTimeout(() => setIsModalOpen(false), 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit request.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;

  const sections = [
    { t: 'Employment', i: Briefcase, f: [
        { l: 'ID', v: profile?.employee_id || profile?.university_id, i: Lock },
        { l: 'Department', v: profile?.department_name || profile?.department, i: Building },
        { l: 'Role', v: profile?.designation_name || profile?.designation, i: User },
        { l: 'Joined', v: profile?.joining_date ? new Date(profile.joining_date).toLocaleDateString() : '—', i: Calendar },
    ]},
    { t: 'Communications', i: Mail, f: [
        { l: 'Email', v: profile?.email || user?.email, i: Mail },
        { l: 'Dial', v: profile?.phone, i: Phone },
        { l: 'Spatial', v: profile?.address, i: MapPin },
    ]},
    { t: 'Fiscal Credentials', i: CreditCard, f: [
        { l: 'Bank', v: profile?.bank_name, i: Globe },
        { l: 'Account', v: profile?.bank_account, i: CreditCard },
        { l: 'IFSC', v: profile?.bank_ifsc, i: ShieldAlert },
    ]}
  ];

  return (
    <div className="max-w-auto space-y-8 animate-fade-in pb-20">
      <div className="bg-card border border-border rounded-3xl p-10 relative overflow-hidden group shadow-soft">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
        <div className="flex items-center gap-10 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-4xl shadow-xl shadow-primary/20">{profile?.name?.[0] || user?.name?.[0]}</div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">{profile?.name || user?.name}</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1">{profile?.role || user?.role} • {profile?.department_name || 'Staff'}</p>
            <div className="flex gap-3 mt-4">
              <span className="px-4 py-1.5 bg-muted border border-border rounded-lg text-[10px] font-black text-foreground uppercase tracking-widest leading-none">{profile?.employee_id || 'ID UNASSIGNED'}</span>
              <span className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none"><CheckCircle2 size={10} /> Verified</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft flex flex-col">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <s.i className="w-4 h-4 text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.t}</h2>
              </div>
              <button 
                onClick={() => openRequestModal(s.t)}
                className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 py-1 rounded-md hover:bg-primary hover:text-white transition-all flex items-center gap-1"
              >
                <MessageSquare size={10} /> Request Change
              </button>
            </div>
            <div className="p-8 space-y-8 flex-1">
              {s.f.map((f, fi) => (
                <div key={fi} className="space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-2 leading-none"><f.i className="w-2.5 h-2.5" /> {f.l}</p>
                  <p className={`text-xs font-bold ${f.v ? 'text-foreground' : 'text-muted-foreground/60 italic'}`}>{f.v || 'Not Indexed'}</p>
                </div>
              ))}
            </div>
            <div className="px-8 py-4 bg-muted/20 border-t border-border mt-auto">
               <p className="text-[8px] text-muted-foreground uppercase font-bold flex items-center gap-2"><Lock size={8} /> Admin Managed Section</p>
            </div>
          </div>
        ))}
      </div>

      {/* Support Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col scale-100 animate-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                   <MessageSquare className="w-5 h-5" />
                 </div>
                 <div>
                   <h2 className="text-sm font-black uppercase tracking-widest">Raise Support Request</h2>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold">{requestCategory} Update</p>
                 </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                 <X size={20} />
               </button>
            </div>

            <div className="p-8 space-y-6">
               {message ? (
                 <div className={`p-4 rounded-2xl flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                   {message.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                   <p className="text-xs font-bold uppercase tracking-tight">{message.text}</p>
                 </div>
               ) : (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detailed Description</label>
                     <textarea 
                       className="w-full h-32 p-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-medium resize-none"
                       placeholder={`Explain what changes you need in your ${requestCategory.toLowerCase()} details...`}
                       value={requestDescription}
                       onChange={(e) => setRequestDescription(e.target.value)}
                     />
                   </div>
                   <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                     <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                     <p className="text-[10px] text-muted-foreground font-medium leading-relaxed uppercase tracking-tight">
                       Security Note: Major changes require manual verification by the HR department. You will be notified once reviewed.
                     </p>
                   </div>
                 </>
               )}
            </div>

            {!message && (
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitRequest}
                  disabled={submitting || !requestDescription}
                  className="px-8 py-2.5 bg-primary text-secondary rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send size={12} />}
                  Submit Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
