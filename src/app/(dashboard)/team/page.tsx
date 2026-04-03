'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, Phone, Building2, BadgeCheck, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department_name: string;
  designation_name: string;
  university_id: string;
  role: string;
  level?: number;
  reports_count: number;
}

export default function MyTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
      }
    } catch (err) {
      console.error('Failed to fetch team');
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-400" />
            My Team
          </h1>
          <p className="text-white/50 mt-1">Manage and oversee your reporting hierarchy and department staff.</p>
        </div>
        
        <div className="flex items-center gap-3 glass px-4 py-2 rounded-2xl border border-white/5">
          <span className="text-sm font-medium text-white/70">{team.length} Members</span>
        </div>
      </header>

      {team.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center border border-white/5">
          <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 italic">No team members found in your reporting line or department.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member) => (
            <div key={member.id} className="glass group hover:bg-white/5 transition-all duration-300 rounded-3xl border border-white/10 overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/10">
                    {member.first_name[0]}{member.last_name[0]}
                  </div>
                  {member.role === 'ADMIN' && (
                    <span className="bg-primary-500/10 text-primary-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg">Admin</span>
                  )}
                  {member.reports_count > 0 && (
                    <span className="bg-success-500/10 text-success-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg">Manager</span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-1">
                  {member.first_name} {member.last_name}
                </h3>
                <p className="text-xs text-white/40 mb-4 font-mono">{member.university_id}</p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <BadgeCheck className="w-4 h-4 text-primary-400" />
                    <span>{member.designation_name || 'Staff Member'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Building2 className="w-4 h-4 text-primary-400" />
                    <span>{member.department_name}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-3 text-sm text-white/40 group-hover:text-white/70 transition-colors">
                    <Mail className="w-4 h-4" />
                    <span>{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-3 text-sm text-white/40 group-hover:text-white/70 transition-colors">
                      <Phone className="w-4 h-4" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-white/5 flex items-center justify-between border-t border-white/5">
                <span className="text-xs text-white/30 truncate">
                  {member.reports_count > 0 ? `${member.reports_count} reports` : 'Individual Contributor'}
                </span>
                <Link 
                  href={`/employees/${member.university_id}`}
                  className="flex items-center gap-2 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Details
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

