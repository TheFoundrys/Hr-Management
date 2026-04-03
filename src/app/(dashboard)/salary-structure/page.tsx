'use client';

import { useEffect, useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';

interface SalaryRecord {
  id: string;
  employeeId: string;
  name: string;
  month: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: string;
}

export default function SalaryStructurePage() {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRecords = () => {
    setLoading(true);
    fetch('/api/salary-structure')
      .then(res => res.json())
      .then(data => {
        if (data.success) setRecords(data.records);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/salary-structure', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRecord),
      });
      if (res.ok) {
        setEditingRecord(null);
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Wallet className="w-7 h-7 text-primary-400" /> Salary Structure
        </h1>
        <p className="text-white/40 text-sm">{records.length} records found</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase">Employee ID</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase">Name</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase">Month</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase text-right">Basic</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase text-right">HRA</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase text-right">Gross</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase text-right">Deductions</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase text-right">Net</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-medium text-white/40 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-primary-400 font-mono">{rec.employeeId}</td>
                    <td className="py-3 px-4 text-sm text-white/80 font-medium">{rec.name}</td>
                    <td className="py-3 px-4 text-sm text-white/50">{rec.month}</td>
                    <td className="py-3 px-4 text-sm text-white/60 text-right">₹{rec.basicSalary.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-white/60 text-right">₹{rec.hra.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-white/80 font-bold text-right">₹{rec.grossSalary.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-danger-400 text-right">₹{rec.deductions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-success-400 font-bold text-right">₹{rec.netSalary.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rec.status === 'processed' ? 'bg-success-500/10 text-success-400' : 'bg-white/5 text-white/60'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => setEditingRecord(rec)}
                        className="text-primary-400 hover:text-primary-300 transition-colors text-xs font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm animate-fade-in shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Edit Salary</h2>
            <p className="text-white/40 text-sm mb-6">{editingRecord.name} ({editingRecord.employeeId})</p>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Basic Salary</label>
                <input
                  type="number" required
                  value={editingRecord.basicSalary}
                  onChange={e => setEditingRecord({...editingRecord, basicSalary: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">HRA</label>
                <input
                  type="number" required
                  value={editingRecord.hra}
                  onChange={e => setEditingRecord({...editingRecord, hra: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Allowances</label>
                <input
                  type="number" required
                  value={editingRecord.allowances}
                  onChange={e => setEditingRecord({...editingRecord, allowances: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Deductions</label>
                <input
                  type="number" required
                  value={editingRecord.deductions}
                  onChange={e => setEditingRecord({...editingRecord, deductions: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 outline-none text-danger-400"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2 rounded-xl text-white/60 hover:bg-white/5 transition-all text-sm border border-white/10"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 py-2 gradient-primary rounded-xl text-white text-sm font-medium shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
