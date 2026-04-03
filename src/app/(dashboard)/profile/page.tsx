'use client';

import { useEffect, useState } from 'react';
import { UserCircle, Mail, Phone, MapPin, Building, Briefcase, Calendar, CreditCard, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/employees/me');
      const json = await res.json();
      if (json.success) setProfile(json.employee);
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const sections = [
    {
      title: 'Employment Details',
      icon: Briefcase,
      fields: [
        { label: 'Employee ID', value: profile?.employee_id, icon: ShieldAlert },
        { label: 'Department', value: profile?.department_name || profile?.department, icon: Building },
        { label: 'Designation', value: profile?.designation, icon: Briefcase },
        { label: 'Joining Date', value: profile?.date_of_joining ? new Date(profile.date_of_joining).toLocaleDateString() : '—', icon: Calendar },
      ]
    },
    {
      title: 'Contact Information',
      icon: Mail,
      fields: [
        { label: 'Official Email', value: profile?.email, icon: Mail },
        { label: 'Phone Number', value: profile?.phone, icon: Phone },
        { label: 'Current Address', value: profile?.address, icon: MapPin },
      ]
    },
    {
      title: 'Bank & Statutory',
      icon: CreditCard,
      fields: [
        { label: 'Bank Name', value: profile?.bank_name, icon: Building },
        { label: 'Account Number', value: profile?.bank_account, icon: CreditCard },
        { label: 'IFSC Code', value: profile?.bank_ifsc, icon: ShieldAlert },
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Profile Header */}
      <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] -mr-32 -mt-32" />
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-32 h-32 rounded-3xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary-500/20">
            <UserCircle className="w-16 h-16 text-white/50" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">{profile?.name || user?.name}</h1>
            <p className="text-primary-400 font-medium mt-1 uppercase tracking-widest text-xs">{profile?.role} • {profile?.department}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/50 font-bold uppercase tracking-widest">{profile?.employee_id}</span>
              <span className="px-3 py-1 bg-accent-500/10 border border-accent-500/20 rounded-full text-[10px] text-accent-400 font-bold uppercase tracking-widest">Active</span>
              <a href="/profile/qr" className="flex items-center gap-2 px-4 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 rounded-xl text-primary-400 text-xs font-bold uppercase tracking-wider transition-all transition-all">
                My QR Code
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
              <section.icon className="w-5 h-5 text-primary-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{section.title}</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {section.fields.map((field, fIdx) => (
                <div key={fIdx} className="space-y-1.5 group">
                  <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest flex items-center gap-2">
                    <field.icon className="w-3 h-3" /> {field.label}
                  </p>
                  <p className="text-sm text-white/80 font-medium group-hover:text-white transition-colors">{field.value || 'Not provided'}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
