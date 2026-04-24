'use client';
import { useEffect, useState, use } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { User, Mail, Briefcase, Building, Save, ArrowLeft, Loader2, UserCircle, Shield, CreditCard, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>(null);

  const roles = [
    { id: 'ADMIN', label: 'Administrator' },
    { id: 'HR', label: 'HR Officer' },
    { id: 'HR_MANAGER', label: 'HR Manager' },
    { id: 'MANAGER', label: 'Line Manager' },
    { id: 'HOD', label: 'Head of Department' },
    { id: 'EMPLOYEE', label: 'Standard Employee' },
    { id: 'FACULTY', label: 'Teaching Faculty' },
    { id: 'STAFF', label: 'Operational Staff' }
  ];

  const fetchData = async () => {
    try {
      const [empRes, deptRes, desRes, manRes] = await Promise.all([
        fetch(`/api/employees/${id}`),
        fetch('/api/admin/scheduling/departments'),
        fetch('/api/admin/designations'),
        fetch('/api/employees')
      ]);

      const empData = await empRes.json();
      const deptData = await deptRes.json();
      const desData = await desRes.json();
      const manData = await manRes.json();

      if (empData.success) setFormData(empData.employee);
      if (deptData.success) setDepartments(deptData.departments);
      if (desData.success) setDesignations(desData.designations);
      if (manData.success) setManagers(manData.employees.filter((e: any) => e.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) router.push(`/employees/${id}`);
      else alert('Failed to update profile');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  const isCompany = currentUser?.tenantType === 'COMPANY';

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <Link href={`/employees/${id}`} className="p-3 bg-muted border border-border rounded-2xl text-muted-foreground hover:text-foreground transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Modify Identity</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Refining Professional Records • {formData.name}</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit} 
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
          Save Changes
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-[2.5rem] p-8 text-center space-y-4 shadow-sm relative overflow-hidden">
             <div className="w-24 h-24 bg-muted rounded-[2rem] mx-auto flex items-center justify-center text-3xl font-black text-primary shadow-inner">
                {formData.name[0]}
             </div>
             <div>
                <p className="font-black text-foreground text-xl">{formData.name}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{formData.employeeId || formData.employee_id}</p>
             </div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-6 space-y-4 shadow-sm">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">System Security</p>
             <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border">
                   <Shield size={18} className="text-primary" />
                   <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Account Status</p>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="bg-transparent text-sm font-bold text-foreground outline-none cursor-pointer">
                        <option value="active" className="bg-card">Active Access</option>
                        <option value="inactive" className="bg-card">Revoked / Inactive</option>
                      </select>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Form Area */}
        <form className="lg:col-span-2 space-y-8 pb-20">
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
               <UserCircle size={20} className="text-primary" />
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Core Personal Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-[2.5rem] p-8 shadow-sm">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Legal Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Terminal Email Address</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:border-primary transition-all" />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
               <Briefcase size={20} className="text-primary" />
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Professional Assignment</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-[2.5rem] p-8 shadow-sm">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Organizational Role</label>
                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:border-primary transition-all">
                  {roles.map(r => <option key={r.id} value={r.id} className="bg-card">{r.label}</option>)}
                </select>
              </div>
              {!isCompany && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Department</label>
                  <select 
                    value={formData.departmentId || formData.department_id || ''} 
                    onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                    className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:border-primary transition-all"
                  >
                    <option value="" className="bg-card">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id} className="bg-card">{d.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Active Designation</label>
                <select 
                  value={formData.designationId || formData.designation_id || ''} 
                  onChange={(e) => setFormData({...formData, designationId: e.target.value})}
                  className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:border-primary transition-all"
                >
                  <option value="" className="bg-card">Select Designation</option>
                  {designations.map(d => <option key={d.id} value={d.id} className="bg-card">{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reports To (Manager)</label>
                <select 
                  value={formData.reportsToId || formData.reports_to_id || ''} 
                  onChange={(e) => setFormData({...formData, reportsToId: e.target.value})}
                  className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:border-primary transition-all"
                >
                  <option value="" className="bg-card">Select Manager</option>
                  {managers.map(m => <option key={m.id} value={m.id} className="bg-card">{m.name} ({m.employee_id})</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
               <CreditCard size={20} className="text-primary" />
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Remuneration & Payroll</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-card border border-border rounded-[2.5rem] p-8 shadow-sm">
              {[
                { label: 'Basic Salary', key: 'basic' },
                { label: 'HRA Benefit', key: 'hra' },
                { label: 'Allowances', key: 'allowances' },
                { label: 'Deductions', key: 'deductions' }
              ].map(f => (
                <div key={f.key} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{f.label}</label>
                  <input 
                    type="number" 
                    value={formData.salary?.[f.key] || 0} 
                    onChange={e => setFormData({
                      ...formData, 
                      salary: { ...formData.salary, [f.key]: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-black text-foreground outline-none focus:border-primary transition-all" 
                  />
                </div>
              ))}
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
