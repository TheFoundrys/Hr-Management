'use client';

import { useEffect, useState } from 'react';
import { Wallet, Loader2, Download, Play, Calendar, User, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { FinancesNav } from '@/components/FinancesNav';

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
  employee_name?: string;
  employee_id?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayrollPage() {
  const { user } = useAuthStore();
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [overrideData, setOverrideData] = useState({ basic: 0, hra: 0, allowances: 0, deductions: 0 });

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

  const openOverride = (p: PayslipRow) => {
    setSelectedPayslip(p);
    setOverrideData({
      basic: Number(p.basic_salary) || 0,
      hra: Number(p.hra) || 0,
      allowances: Number(p.allowances) || 0,
      deductions: Number(p.deductions) || 0,
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (statusOverride?: string) => {
    if (!selectedPayslip) return;
    const net = (overrideData.basic + overrideData.hra + overrideData.allowances) - overrideData.deductions;
    
    try {
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPayslip.id,
          basic_salary: overrideData.basic,
          hra: overrideData.hra,
          allowances: overrideData.allowances,
          deductions: overrideData.deductions,
          net_salary: net,
          status: statusOverride || selectedPayslip.status
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchPayslips();
      }
    } catch (err) { console.error(err); }
  };

  const generatePayroll = async () => {
    if (!confirm(`Are you sure you want to generate payroll for ${MONTHS[month-1]} ${year}?`)) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPayslips();
      } else {
        alert(data.error || 'Failed to generate payroll');
      }
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  };

  const totalPayout = payslips.reduce((s, p) => s + (Number(p.net_salary) || 0), 0);
  const totalDeductions = payslips.reduce((s, p) => s + (Number(p.deductions) || 0), 0);

  return (
    <div className="w-full py-8 px-6 space-y-8 animate-in fade-in duration-500">
      <FinancesNav />
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Wallet size={32} className="text-primary" /> Institutional Payroll
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] pl-1">
            Manage disbursements and financial protocols for {MONTHS[month - 1]} {year}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-card border border-border p-2 rounded-xl shadow-sm">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent text-[10px] font-black uppercase tracking-widest px-4 py-2 outline-none cursor-pointer">
            {MONTHS.map((m, i) => <option key={i} value={i + 1} className="bg-card">{m}</option>)}
          </select>
          <div className="h-4 w-[1px] bg-border" />
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-transparent text-[10px] font-black uppercase tracking-widest px-4 py-2 outline-none cursor-pointer">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y} className="bg-card">{y}</option>)}
          </select>
          <button 
            onClick={generatePayroll} 
            disabled={generating} 
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/10"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {generating ? 'Processing' : 'Execute Batch'}
          </button>
        </div>
      </header>

      {/* Financial Pulse Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Net Disbursement', value: `â‚¹${totalPayout.toLocaleString('en-IN')}`, icon: Wallet, color: 'text-primary bg-primary/5 border-primary/10' },
          { label: 'Total Deductions (LOP/TDS)', value: `â‚¹${totalDeductions.toLocaleString('en-IN')}`, icon: AlertCircle, color: 'text-rose-500 bg-rose-500/5 border-rose-500/10' },
          { label: 'Active Ledger Entries', value: payslips.length, icon: FileText, color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' }
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-xl border flex flex-col gap-4 group hover:scale-[1.02] transition-all duration-300 ${stat.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{stat.label}</span>
              <stat.icon size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Payroll Ledger Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
           <h2 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
             <Calendar size={14} className="text-primary" /> Disbursement Log
           </h2>
           <button className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all">
             <Download size={18} />
           </button>
        </div>
        
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left table-auto">
            <thead>
              <tr className="bg-muted/5">
                {['Personnel', 'Cycle', 'Basic', 'HRA', 'Gross', 'Deductions', 'Net Liquidity', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={9} className="py-24 text-center"><Loader2 className="animate-spin inline-block text-primary" size={32} /></td></tr>
              ) : payslips.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-all group">
                  <td className="px-3 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center font-black text-xs text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                        <User size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground tracking-tight">{p.employee_name || 'System User'}</p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{p.employee_id || p.user_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-5">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">{p.year}-{String(p.month).padStart(2, '0')}</span>
                  </td>
                  <td className="px-3 py-5 text-sm font-bold text-foreground">â‚¹{(Number(p.basic_salary) || 0).toLocaleString()}</td>
                  <td className="px-3 py-5 text-sm font-bold text-foreground">â‚¹{(Number(p.hra) || 0).toLocaleString()}</td>
                  <td className="px-3 py-5 text-sm font-bold text-foreground">â‚¹{(Number(p.basic_salary) + Number(p.hra) + Number(p.allowances)).toLocaleString()}</td>
                  <td className="px-3 py-5 text-sm font-bold text-rose-500">-â‚¹{(Number(p.deductions) || 0).toLocaleString()}</td>
                  <td className="px-3 py-5">
                    <p className="text-sm font-black text-primary tracking-tighter">â‚¹{(Number(p.net_salary) || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-3 py-5">
                    <span className={`px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 w-fit ${
                      p.status === 'generated' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      p.status === 'suspended' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {p.status === 'generated' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <button onClick={() => openOverride(p)} className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-all">
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && payslips.length === 0 && (
                <tr><td colSpan={9} className="py-24 text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Institutional Records Empty</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Modal */}
      {isModalOpen && selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-border bg-muted/20">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Override Parameters</h2>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                    {selectedPayslip.employee_name} · {selectedPayslip.employee_id}
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-all">&times;</button>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Basic Allocation', key: 'basic' },
                  { label: 'Housing Allowance (HRA)', key: 'hra' },
                  { label: 'Variable Allowances', key: 'allowances' },
                  { label: 'Mandatory Deductions', key: 'deductions', isRed: true }
                ].map((f) => (
                  <div key={f.key} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{f.label}</label>
                    <input 
                      type="number" 
                      value={overrideData[f.key as keyof typeof overrideData]} 
                      onChange={e => setOverrideData({ ...overrideData, [f.key]: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-5 py-4 bg-muted border border-border rounded-xl text-lg font-black outline-none focus:border-primary transition-all ${f.isRed ? 'text-rose-500' : 'text-foreground'}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-muted/10 flex gap-4">
              <button 
                onClick={() => handleUpdate('suspended')}
                className="flex-1 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:bg-muted transition-all"
              >
                Suspend
              </button>
              <button 
                onClick={() => handleUpdate('generated')}
                className="flex-[2] px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
              >
                Deploy Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


