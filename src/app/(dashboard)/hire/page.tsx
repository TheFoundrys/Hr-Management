'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HirePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ 
    employeeId: '', name: '', email: '', role: '', 
    departmentId: '', designationId: '', reportsToId: '', 
    salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 } 
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptRes = await fetch('/api/admin/scheduling/departments');
        const deptData = await deptRes.json();
        if (deptData.success) setDepartments(deptData.departments);

        const desRes = await fetch('/api/admin/designations');
        const desData = await desRes.json();
        if (desData.success) setDesignations(desData.designations);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setForm({ employeeId: '', name: '', email: '', role: '', departmentId: '', designationId: '', reportsToId: '', salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 } });
        setTimeout(() => {
          setSuccess(false);
          router.push('/employees');
        }, 2000);
      } else {
        alert(data.error || 'Failed to add employee');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompany = user?.tenantType === 'COMPANY';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-full py-12 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-2">
        <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <UserPlus size={32} className="text-primary" />
          </div>
          Hire New Talent
        </h1>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] pl-1">
          Expand your team and onboard new members
        </p>
      </header>

      {success ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-12 rounded-xl flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Onboarding Successful</h2>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Redirecting to directory...</p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-10 shadow-sm shadow-primary/5">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Identity Name</label>
                <input 
                  required 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g. John Doe"
                  className="w-full px-6 py-4 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:border-primary focus:bg-card transition-all text-foreground" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Terminal Address (Email)</label>
                <input 
                  type="email" 
                  required 
                  value={form.email} 
                  onChange={e => setForm({ ...form, email: e.target.value })} 
                  placeholder="john.doe@organization.com"
                  className="w-full px-6 py-4 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:border-primary focus:bg-card transition-all text-foreground" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Corporate Role</label>
                <select 
                  required 
                  value={form.role} 
                  onChange={e => setForm({ ...form, role: e.target.value })} 
                  className="w-full px-6 py-4 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:border-primary focus:bg-card transition-all text-foreground appearance-none"
                >
                  <option value="" className="bg-card">Select Role</option>
                  {(user?.tenantSettings?.roles ? Object.keys(user.tenantSettings.roles) : ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']).map((r: string) => (
                    <option key={r} value={r} className="bg-card">{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {(user?.tenantSettings?.hierarchy?.custom_labels?.employee_id || (isCompany ? 'Employee ID' : 'University ID'))}
                </label>
                <input 
                  required 
                  value={form.employeeId} 
                  onChange={e => setForm({ ...form, employeeId: e.target.value })} 
                  placeholder="e.g. TO-0001"
                  className="w-full px-6 py-4 bg-muted/50 border border-border rounded-xl text-sm font-black outline-none focus:border-primary focus:bg-card transition-all text-foreground placeholder:opacity-30" 
                />
              </div>
              {!isCompany && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {(user?.tenantSettings?.hierarchy?.custom_labels?.department || 'Department')}
                  </label>
                  <select 
                    value={form.departmentId} 
                    onChange={e => setForm({ ...form, departmentId: e.target.value })} 
                    className="w-full px-6 py-4 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:border-primary focus:bg-card transition-all text-foreground appearance-none"
                  >
                    <option value="" className="bg-card">Select {(user?.tenantSettings?.hierarchy?.custom_labels?.department || 'Department')}</option>
                    {departments.map(d => <option key={d.id} value={d.id} className="bg-card">{d.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Designation</label>
                <select 
                  required 
                  value={form.designationId} 
                  onChange={e => setForm({ ...form, designationId: e.target.value })} 
                  className="w-full px-6 py-4 bg-muted/50 border border-border rounded-xl text-sm font-bold outline-none focus:border-primary focus:bg-card transition-all text-foreground appearance-none"
                >
                  <option value="" className="bg-card">Select Designation</option>
                  {designations.map(d => <option key={d.id} value={d.id} className="bg-card">{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="md:col-span-2 pt-10">
               <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-5 bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.4em] rounded-xl shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
              >
                 {isSubmitting ? (
                   <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                   </>
                 ) : 'Initiate Onboarding'}
               </button>
               <p className="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-6">
                 New employees will receive an automated invitation to set up their credentials.
               </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
