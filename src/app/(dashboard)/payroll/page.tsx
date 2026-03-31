'use client';

import { useEffect, useState } from 'react';
import { Wallet, Loader2, Download, Play } from 'lucide-react';

interface PayslipRow {
  id: string;
  user_id: string;
  month: number;
  year: number;
  basic_salary: number;
  hra: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  status: string;
  generated_at: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayrollPage() {
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchPayslips(); }, [month, year]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${month}&year=${year}`);
      const data = await res.json();
      if (data.success) setPayslips(data.payslips || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const generatePayroll = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Generated ${data.payslips?.length || 0} payslips`);
        fetchPayslips();
      }
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  };

  const totalPayout = payslips.reduce((s, p) => s + (p.net_salary || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-7 h-7 text-primary-400" /> Payroll
          </h1>
          <p className="text-white/40 text-sm mt-1">{MONTHS[month - 1]} {year} — {payslips.length} payslips</p>
        </div>
        <button onClick={generatePayroll} disabled={generating} className="gradient-primary px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate Payroll'}
        </button>
      </div>

      {/* Period Selector */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1} className="bg-surface-900">{m}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y} className="bg-surface-900">{y}</option>
          ))}
        </select>
        <div className="ml-auto glass rounded-xl px-4 py-2">
          <span className="text-xs text-white/40">Total Payout</span>
          <span className="ml-2 text-lg font-bold text-accent-400">₹{totalPayout.toLocaleString('en-IN')}</span>
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
                  {['Employee', 'Basic', 'HRA', 'Allowances', 'Deductions', 'Net Salary', 'Working Days', 'Present', 'Absent', 'Status'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-primary-400 font-mono">{p.user_id}</td>
                    <td className="py-3 px-4 text-sm text-white/60">₹{(p.basic_salary || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-white/60">₹{(p.hra || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-white/60">₹{(p.allowances || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-danger-500">-₹{(p.deductions || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-accent-400 font-semibold">₹{(p.net_salary || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-white/50">{p.working_days}</td>
                    <td className="py-3 px-4 text-sm text-white/50">{p.present_days}</td>
                    <td className="py-3 px-4 text-sm text-white/50">{p.absent_days}</td>
                    <td className="py-3 px-4"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-accent-500/15 text-accent-400 capitalize">{p.status}</span></td>
                  </tr>
                ))}
                {payslips.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-white/30">No payslips generated for this period</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
