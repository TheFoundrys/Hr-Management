'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { Users, UserPlus, Search, Edit2, Trash2, Building2, Briefcase, Mail, Filter, Download, ChevronRight, X, Loader2, User } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ 
    employeeId: '', name: '', email: '', role: '', 
    departmentId: '', designationId: '', reportsToId: '', 
    salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 } 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) setEmployees(data.employees);

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

  useEffect(() => {
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
        setShowAddModal(false);
        fetchData();
        setForm({ employeeId: '', name: '', email: '', role: '', departmentId: '', designationId: '', reportsToId: '', salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 } });
      } else {
        alert(data.error || 'Failed to add employee');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e => {
    const s = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(s) ||
      e.employee_id.toLowerCase().includes(s) ||
      String(e.department_name || '').toLowerCase().includes(s) ||
      String(e.designation_name || '').toLowerCase().includes(s)
    );
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    departments: [...new Set(employees.map(e => e.department_id))].length,
    roles: [...new Set(employees.map(e => e.role))].length
  };

  const isCompany = user?.tenantType === 'COMPANY';

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Users size={32} className="text-primary" /> Staff Directory
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] pl-1">
            Manage your workforce and access profiles
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <UserPlus size={16} strokeWidth={3} /> Add Employee
        </button>
      </header>

      {/* Mini Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Workforce', value: stats.total, icon: Users, color: 'text-primary' },
          { label: 'Active Status', value: stats.active, icon: UserCheck, color: 'text-emerald-500' },
          { label: isCompany ? 'Designations' : 'Departments', value: isCompany ? designations.length : stats.departments, icon: Building2, color: 'text-amber-500' },
          { label: 'Unique Roles', value: stats.roles, icon: Briefcase, color: 'text-indigo-500' }
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-primary/20 transition-all group">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">{s.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-foreground">{s.value}</p>
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/5 transition-colors ${s.color}`}>
                <s.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Directory Table */}
      <div className="bg-card border border-border rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-xl flex-1 max-w-md shadow-sm focus-within:border-primary transition-all">
              <Search size={16} className="text-muted-foreground" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, ID or role..." 
                className="bg-transparent border-none outline-none text-sm w-full font-medium"
              />
           </div>
           <div className="flex items-center gap-2">
              <button className="p-3 bg-card border border-border text-muted-foreground rounded-xl hover:text-foreground hover:border-primary transition-all shadow-sm">
                 <Filter size={18} />
              </button>
              <button className="p-3 bg-card border border-border text-muted-foreground rounded-xl hover:text-foreground hover:border-primary transition-all shadow-sm">
                 <Download size={18} />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/5">
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{isCompany ? 'Designation' : 'Department \u0026 Role'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contact</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin inline-block text-primary" size={32} /></td></tr>
              ) : filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-all group cursor-pointer">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-black text-primary text-sm group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          {emp.name?.[0] || '?'}
                       </div>
                       <div>
                          <p className="text-sm font-black text-foreground tracking-tight">{emp.name || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{emp.employee_id}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                       <p className="text-xs font-black text-foreground/80 uppercase">
                          {isCompany ? (emp.designation_name || 'Staff') : (emp.department_name || 'General')}
                       </p>
                       {!isCompany && <p className="text-[10px] text-muted-foreground font-bold">{emp.role}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all">
                       <Mail size={14} />
                       <span className="text-[11px] font-bold">{emp.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                      emp.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right space-x-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this employee?')) {
                          fetch(`/api/employees/${emp.id}`, { method: 'DELETE' })
                            .then(res => res.json())
                            .then(data => {
                              if (data.success) fetchData();
                              else alert(data.error);
                            });
                        }
                      }}
                      className="p-3.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all inline-block shadow-sm"
                    >
                       <Trash2 size={18} />
                    </button>
                    <Link href={`/employees/${emp.id}`} className="p-3.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-2xl transition-all inline-block shadow-sm">
                       <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl space-y-8 animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Onboard New Talent</h2>
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Provide essential employee details below</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-muted rounded-2xl transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Identity Name</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all text-foreground" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Terminal Address (Email)</label>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all text-foreground" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Corporate Role</label>
                  <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all text-foreground">
                    <option value="" className="bg-card">Select Role</option>
                    {['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'FACULTY', 'STAFF'].map(r => <option key={r} value={r} className="bg-card">{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Employee Serial ID</label>
                  <input required value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-black outline-none focus:border-primary transition-all text-foreground placeholder:opacity-30" placeholder="e.g. TO-0001" />
                </div>
                {!isCompany && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Department</label>
                    <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all text-foreground">
                      <option value="" className="bg-card">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id} className="bg-card">{d.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Designation</label>
                  <select required value={form.designationId} onChange={e => setForm({ ...form, designationId: e.target.value })} className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all text-foreground">
                    <option value="" className="bg-card">Select Designation</option>
                    {designations.map(d => <option key={d.id} value={d.id} className="bg-card">{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 pt-6 flex gap-4">
                 <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted rounded-2xl transition-all">Cancel</button>
                 <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/10 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                   {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Onboard Employee'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserCheck(props: any) {
  return <User {...props} />;
}
