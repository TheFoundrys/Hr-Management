'use client';

import { useEffect, useState } from 'react';
import { Users, Loader2, Search, Plus, Filter, UserPlus, Shield, Building2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

interface Employee {
  id: string;
  university_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department_name: string;
  designation_name: string;
  reporting_name: string;
}

interface Department {
  id: string;
  name: string;
}

const PREDEFINED_DEPARTMENTS = [
  'School of Computer Science',
  'Department of Mathematics',
  'Faculty of Physics',
  'School of Business & Economics',
  'Department of Humanities',
  'School of Engineering',
  'Faculty of Law',
  'Administration & Registry'
];

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allManagers, setAllManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    email: '',
    role: 'FACULTY',
    departmentId: '',
    reportsToId: '',
    salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 }
  });

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/admin/scheduling/departments')
      ]);
      const empData = await empRes.json();
      const deptData = await deptRes.json();

      if (empData.success) {
        setEmployees(empData.employees);
        setAllManagers(empData.employees); 
      }
      
      // Merge backend departments with predefined ones to ensure list is never empty
      let deptList = deptData.success ? deptData.departments : [];
      const existingNames = new Set(deptList.map((d: any) => d.name));
      
      PREDEFINED_DEPARTMENTS.forEach(name => {
        if (!existingNames.has(name)) {
          deptList.push({ id: `pre-${name}`, name });
        }
      });
      
      setDepartments(deptList);
    } catch (err) {
      console.error(err);
      // Fallback if API fails
      setDepartments(PREDEFINED_DEPARTMENTS.map(name => ({ id: `pre-${name}`, name })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm({
          employeeId: '', name: '', email: '', role: 'FACULTY', 
          departmentId: '', reportsToId: '', 
          salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 }
        });
        fetchInitialData();
      } else {
        alert(data.error || 'Failed to save employee');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name} ${emp.university_id} ${emp.email}`
    .toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-400" />
            Employees
          </h1>
          <p className="text-white/50 mt-1">Manage institutional workforce and reporting structures.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary-400 transition-colors" />
            <input 
              type="text"
              placeholder="Search directory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white w-full md:w-64 focus:border-primary-500/50 outline-none transition-all placeholder:text-white/20"
            />
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="gradient-primary px-6 py-3 rounded-2xl text-white text-sm font-bold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all flex items-center gap-2 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      <div className="glass rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-white/30 text-sm font-medium animate-pulse">Loading directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 text-left border-b border-white/5">
                  <th className="py-5 px-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Identification</th>
                  <th className="py-5 px-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Full Name</th>
                  <th className="py-5 px-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Role & Security</th>
                  <th className="py-5 px-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Department</th>
                  <th className="py-5 px-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Reporting To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="group hover:bg-white/[0.03] transition-colors relative">
                    <td className="py-5 px-6">
                      <span className="text-sm font-mono text-primary-400/80 bg-primary-400/5 px-2 py-1 rounded-lg border border-primary-400/10">
                        {emp.university_id}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors">
                          {emp.first_name} {emp.last_name}
                        </span>
                        <span className="text-[11px] text-white/30 group-hover:text-white/50 transition-colors">
                          {emp.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                         <Shield className={`w-3 h-3 ${emp.role === 'ADMIN' ? 'text-primary-400' : 'text-white/20'}`} />
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase
                           ${emp.role === 'ADMIN' ? 'bg-primary-500/20 text-primary-300' : 'bg-white/5 text-white/40'}`}>
                           {emp.role}
                         </span>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2 text-sm text-white/50">
                        <Building2 className="w-3.5 h-3.5 text-white/20" />
                        {emp.department_name}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-sm text-white/30 italic">
                      {emp.reporting_name || 'No Direct HOD/Dean'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && (
              <div className="py-24 text-center">
                <Users className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <p className="text-white/20 font-medium italic">No employees match your search criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass rounded-[32px] p-8 w-full max-w-lg border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Institutional Onboarding</h2>
                <p className="text-white/40 text-xs mt-1">Register a new employee with reporting hierarchy.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Employee ID</label>
                  <input type="text" required value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary-500/50 outline-none transition-all" placeholder="TFU-00001" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Academic Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value, departmentId: '', reportsToId: ''})} className="w-full bg-surface-900 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary-500/50 outline-none transition-all">
                    <option value="FACULTY">Faculty (Teaching)</option>
                    <option value="HOD">HOD (Head of Dept)</option>
                    <option value="STAFF">Administrative Staff</option>
                    <option value="ADMIN">Dean / System Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Full Identity Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary-500/50 outline-none transition-all" placeholder="Enter full legal name" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Corporate Email Address</label>
                <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary-500/50 outline-none transition-all" placeholder="username@university.edu" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Department</label>
                  <select required value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})} className="w-full bg-surface-900 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary-500/50 outline-none transition-all">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">
                    {form.role === 'HOD' ? 'Reporting Dean' : 'Reporting HOD'}
                  </label>
                  <select value={form.reportsToId} onChange={e => setForm({...form, reportsToId: e.target.value})} className="w-full bg-surface-900 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary-500/50 outline-none transition-all">
                    <option value="">No Direct Reporting</option>
                    {allManagers
                      ?.filter(m => (form.role === 'HOD' ? m.role === 'ADMIN' : m.role === 'HOD'))
                      .map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl text-sm font-bold text-white/40 hover:bg-white/5 transition-all active:scale-95">Cancel</button>
                <button type="submit" disabled={saving} className="flex-2 py-4 gradient-primary rounded-2xl text-white text-sm font-bold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-3 active:scale-95">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {saving ? 'Processing...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
