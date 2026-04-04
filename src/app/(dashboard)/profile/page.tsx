'use client';

import { useEffect, useState } from 'react';
import { 
  UserCircle, Mail, Phone, MapPin, Building, Briefcase, 
  Calendar, CreditCard, ShieldAlert, Loader2, CheckCircle2,
  Lock, Globe, User
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/employees/me');
        const json = await res.json();
        if (json.success) {
          setProfile(json.employee);
        } else {
          console.warn('Profile fetch unsuccessful:', json.error);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] opacity-40 gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm font-bold uppercase tracking-widest animate-pulse">Syncing Profile Data...</span>
      </div>
    );
  }

  const sections = [
    {
      title: 'Employment Details',
      icon: Briefcase,
      color: 'primary',
      fields: [
        { label: 'Uni Identifier', value: profile?.employee_id || profile?.university_id, icon: Lock },
        { label: 'Structural Node', value: profile?.department_name || profile?.department, icon: Building },
        { label: 'Active Role', value: profile?.designation_name || profile?.designation, icon: User },
        { label: 'Onboarding Date', value: profile?.joining_date || profile?.date_of_joining ? new Date(profile.joining_date || profile.date_of_joining).toLocaleDateString() : '—', icon: Calendar },
      ]
    },
    {
      title: 'Contact Information',
      icon: Mail,
      color: 'indigo',
      fields: [
        { label: 'Institutional Mail', value: profile?.email || user?.email, icon: Mail },
        { label: 'Direct Dial', value: profile?.phone, icon: Phone },
        { label: 'Spatial Registry', value: profile?.address, icon: MapPin },
      ]
    },
    {
      title: 'Structural Credentials',
      icon: CreditCard,
      color: 'emerald',
      fields: [
        { label: 'Primary Fiscal Node', value: profile?.bank_name, icon: Globe },
        { label: 'Credential ID', value: profile?.bank_account, icon: CreditCard },
        { label: 'Inter-Bank Routing', value: profile?.bank_ifsc, icon: ShieldAlert },
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Profile Header */}
      <div className="bg-card border rounded-3xl p-10 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-3xl group-hover:scale-110 transition-transform duration-700" />
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="w-32 h-32 rounded-2xl bg-primary text-secondary flex items-center justify-center font-bold text-4xl shadow-xl shadow-primary/10">
            {profile?.name?.[0] || user?.name?.[0] || 'U'}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-black uppercase tracking-tight text-foreground leading-tight">{profile?.name || user?.name}</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-2 opacity-60">
              {profile?.role || user?.role} • {profile?.department_name || profile?.department || 'Institution Staff'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
              <span className="px-5 py-2 bg-muted border rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm">{profile?.employee_id || 'ID UNASSIGNED'}</span>
              <span className="flex items-center gap-2 px-5 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-600 font-bold uppercase tracking-widest shadow-sm">
                <CheckCircle2 size={12} /> Verification Status: Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-card border rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="px-8 py-5 border-b bg-muted/30 flex items-center gap-4">
              <div className={`p-2.5 rounded-lg bg-${section.color}-500/10 text-${section.color}-600`}>
                 <section.icon className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground opacity-80">{section.title}</h2>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {section.fields.map((field, fIdx) => (
                <div key={fIdx} className="space-y-2 group">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.15em] flex items-center gap-2 opacity-40 group-hover:opacity-60 transition-opacity">
                    <field.icon className="w-3 h-3" /> {field.label}
                  </p>
                  <p className={`text-sm font-bold transition-colors ${field.value ? 'text-foreground/90' : 'text-muted-foreground/30 italic'}`}>
                    {field.value || 'Data record not indexed'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
