'use client';

import { useState } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { FinancesNav } from '@/components/FinancesNav';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface ReportRow {
  employeeId: string;
  name: string;
  department: string;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDay: number;
  totalLeave: number;
  totalHours: string;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=attendance&month=${month}&year=${year}`);
      const data = await res.json();
      if (data.success) setReport(data.report);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const downloadCSV = () => {
    window.open(`/api/reports?type=attendance&month=${month}&year=${year}&format=csv`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
      <FinancesNav />
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <BarChart3 size={32} className="text-primary" /> Reports Center
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2 pl-1">
            Generate and export institutional records
          </p>
        </div>
      </header>

      {/* Controls Container */}
      <div className="bg-card border border-border p-5 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex flex-1 gap-4 w-full">
           <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reporting Month</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-bold text-foreground outline-none focus:border-primary transition-all">
                {MONTHS.map((m, i) => <option key={i} value={i + 1} className="bg-card">{m}</option>)}
              </select>
           </div>
           <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Financial Year</label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-bold text-foreground outline-none focus:border-primary transition-all">
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y} className="bg-card">{y}</option>)}
              </select>
           </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto md:pt-5">
           <button 
             onClick={fetchReport} 
             disabled={loading} 
             className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
           >
             {loading ? <Loader2 className="animate-spin" size={16} /> : <BarChart3 size={16} />}
             Generate
           </button>
           {report.length > 0 && (
             <button 
               onClick={downloadCSV} 
               className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-muted border border-border text-foreground px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-card transition-all"
             >
               <Download size={16} /> Export CSV
             </button>
           )}
        </div>
      </div>

      {/* Report Results */}
      <div className="bg-card border border-border rounded-[2.5rem] shadow-sm overflow-hidden">
        {report.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {['Employee ID', 'Name', 'Department', 'Ontime', 'Absent', 'Late', 'Half Day', 'Leave', 'Total Hours'].map((h) => (
                    <th key={h} className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.map((r) => (
                  <tr key={r.employeeId} className="hover:bg-muted/30 transition-all">
                    <td className="px-6 py-5 text-[11px] font-black text-primary uppercase tracking-tighter">{r.employeeId}</td>
                    <td className="px-6 py-5 text-sm font-black text-foreground tracking-tight">{r.name}</td>
                    <td className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase">{r.department}</td>
                    <td className="px-6 py-5 text-sm font-black text-emerald-500">{r.totalPresent}</td>
                    <td className="px-6 py-5 text-sm font-black text-rose-500">{r.totalAbsent}</td>
                    <td className="px-6 py-5 text-sm font-black text-amber-500">{r.totalLate}</td>
                    <td className="px-6 py-5 text-sm font-black text-indigo-500">{r.totalHalfDay}</td>
                    <td className="px-6 py-5 text-sm font-black text-primary">{r.totalLeave}</td>
                    <td className="px-6 py-5 text-sm font-black text-foreground">{r.totalHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center space-y-4">
             <div className="w-16 h-16 bg-muted rounded-[1.5rem] flex items-center justify-center mx-auto text-muted-foreground">
                <BarChart3 size={32} strokeWidth={1} />
             </div>
             <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">
               {loading ? 'Compiling Institutional Data...' : 'Select period to generate report'}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
