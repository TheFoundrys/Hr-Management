'use client';

import { useEffect, useState } from 'react';
import { Wallet, Loader2, Edit3, X } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
    fetchRecords();
  }, []);

  if (!mounted) return null;


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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3 uppercase tracking-tight">
            <Wallet className="w-7 h-7 text-primary" /> Salary Configuration
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 leading-none">Financial Asset Node Management</p>
        </div>
        <div className="px-5 py-2 bg-muted border border-border rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-soft">
          {records.length} Active Profiles
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Personnel</th>
                  <th className="py-4 px-6">Cycle</th>
                  <th className="py-4 px-6 text-right">Basic</th>
                  <th className="py-4 px-6 text-right">HRA</th>
                  <th className="py-4 px-6 text-right">Gross</th>
                  <th className="py-4 px-6 text-right">Deductions</th>
                  <th className="py-4 px-6 text-right">Net Liquidity</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-4 px-6 text-xs text-primary font-mono font-bold">{rec.employeeId}</td>
                    <td className="py-4 px-6 text-sm font-black uppercase tracking-tight">{rec.name}</td>
                    <td className="py-4 px-6 text-xs text-muted-foreground font-bold">{rec.month}</td>
                    <td className="py-4 px-6 text-sm text-right font-medium">₹{rec.basicSalary.toLocaleString()}</td>
                    <td className="py-4 px-6 text-sm text-right font-medium">₹{rec.hra.toLocaleString()}</td>
                    <td className="py-4 px-6 text-sm text-right font-black">₹{rec.grossSalary.toLocaleString()}</td>
                    <td className="py-4 px-6 text-sm text-right font-bold text-danger">₹{rec.deductions.toLocaleString()}</td>
                    <td className="py-4 px-6 text-sm text-right font-black text-emerald-600">₹{rec.netSalary.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${rec.status === 'processed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setEditingRecord(rec)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-sm animate-slide-up shadow-2xl relative">
            <button onClick={() => setEditingRecord(null)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground p-1 transition-colors"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight mb-1">Override Parameters</h2>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-8">{editingRecord.name} • {editingRecord.employeeId}</p>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Basic Allocation</label>
                <input
                  type="number" required
                  value={editingRecord.basicSalary}
                  onChange={e => setEditingRecord({ ...editingRecord, basicSalary: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground text-sm font-bold focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Housing Allowance (HRA)</label>
                <input
                  type="number" required
                  value={editingRecord.hra}
                  onChange={e => setEditingRecord({ ...editingRecord, hra: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground text-sm font-bold focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Variable Allowances</label>
                <input
                  type="number" required
                  value={editingRecord.allowances}
                  onChange={e => setEditingRecord({ ...editingRecord, allowances: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground text-sm font-bold focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mandatory Deductions</label>
                <input
                  type="number" required
                  value={editingRecord.deductions}
                  onChange={e => setEditingRecord({ ...editingRecord, deductions: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-danger text-sm font-bold focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted border border-border transition-all"
                >
                  Suspend
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Processing...' : 'Deploy Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
