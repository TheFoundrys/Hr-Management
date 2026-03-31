'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Search, X, Loader2 } from 'lucide-react';

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  designation: string;
  deviceUserId: string;
  isActive: boolean;
  dateOfJoining: string;
  salary: { basic: number; hra: number; allowances: number; deductions: number };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    employeeId: '', name: '', email: '', phone: '', role: 'teaching',
    department: '', designation: '', deviceUserId: '', tenantId: 'default',
    salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/employees?search=${search}`);
      const data = await res.json();
      if (data.success) setEmployees(data.employees);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editEntry ? 'PUT' : 'POST';
      const body = editEntry ? { ...form, _id: editEntry._id } : form;
      const res = await fetch('/api/employees', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) { setShowModal(false); setEditEntry(null); fetchEmployees(); }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const openEdit = (emp: Employee) => {
    setEditEntry(emp);
    setForm({
      employeeId: emp.employeeId, name: emp.name, email: emp.email, phone: emp.phone,
      role: emp.role, department: emp.department, designation: emp.designation,
      deviceUserId: emp.deviceUserId, tenantId: 'default',
      salary: emp.salary || { basic: 0, hra: 0, allowances: 0, deductions: 0 },
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditEntry(null);
    setForm({ employeeId: '', name: '', email: '', phone: '', role: 'teaching', department: '', designation: '', deviceUserId: '', tenantId: 'default', salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 } });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-primary-400" /> Employee Management
          </h1>
          <p className="text-white/40 text-sm mt-1">{employees.length} employees registered</p>
        </div>
        <button onClick={openAdd} className="gradient-primary px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Search */}
      <div className="glass-card rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:border-primary-500 transition-colors"
            placeholder="Search by name, email, or ID..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['ID', 'Name', 'Email', 'Department', 'Role', 'Designation', 'Device ID', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-primary-400 font-mono">{emp.employeeId}</td>
                    <td className="py-3 px-4 text-sm text-white/80 font-medium">{emp.name}</td>
                    <td className="py-3 px-4 text-sm text-white/50">{emp.email}</td>
                    <td className="py-3 px-4 text-sm text-white/60">{emp.department}</td>
                    <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${emp.role === 'admin' ? 'bg-primary-500/15 text-primary-400' : emp.role === 'teaching' ? 'bg-accent-500/15 text-accent-400' : 'bg-warning-500/15 text-warning-500'}`}>{emp.role}</span></td>
                    <td className="py-3 px-4 text-sm text-white/50">{emp.designation || '—'}</td>
                    <td className="py-3 px-4 text-sm text-white/40 font-mono">{emp.deviceUserId || '—'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => openEdit(emp)} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Edit</button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-white/30">No employees found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editEntry ? 'Edit' : 'Add'} Employee</h2>
              <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white/70"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Employee ID', key: 'employeeId', placeholder: 'EMP001', disabled: !!editEntry },
                  { label: 'Full Name', key: 'name', placeholder: 'Dr. John Doe' },
                  { label: 'Email', key: 'email', placeholder: 'john@university.edu', type: 'email' },
                  { label: 'Phone', key: 'phone', placeholder: '+91...' },
                  { label: 'Department', key: 'department', placeholder: 'Computer Science' },
                  { label: 'Designation', key: 'designation', placeholder: 'Professor' },
                  { label: 'Device User ID', key: 'deviceUserId', placeholder: 'Biometric device ID' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">{f.label}</label>
                    <input
                      type={f.type || 'text'} value={(form as Record<string, unknown>)[f.key] as string}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:border-primary-500 transition-colors"
                      placeholder={f.placeholder} required={f.key !== 'phone' && f.key !== 'designation' && f.key !== 'deviceUserId'}
                      disabled={f.disabled}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors">
                    <option value="teaching" className="bg-surface-900">Teaching</option>
                    <option value="non-teaching" className="bg-surface-900">Non-Teaching</option>
                    <option value="admin" className="bg-surface-900">Admin</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <h3 className="text-sm font-semibold text-white/70 mb-3">Salary Structure (₹/month)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['basic', 'hra', 'allowances', 'deductions'].map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-white/50 mb-1.5 capitalize">{key}</label>
                      <input
                        type="number" value={(form.salary as Record<string, number>)[key]}
                        onChange={(e) => setForm({ ...form, salary: { ...form.salary, [key]: parseFloat(e.target.value) || 0 } })}
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 gradient-primary rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saving...' : editEntry ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
