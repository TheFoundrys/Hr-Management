'use client';

import { useState } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-primary-400" /> Reports
        </h1>
        <p className="text-white/40 text-sm mt-1">Generate and export attendance reports</p>
      </div>

      {/* Controls */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          {MONTHS.map((m, i) => <option key={i} value={i + 1} className="bg-surface-900">{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y} className="bg-surface-900">{y}</option>)}
        </select>
        <button onClick={fetchReport} disabled={loading} className="gradient-primary px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
          Generate
        </button>
        {report.length > 0 && (
          <button onClick={downloadCSV} className="ml-auto px-4 py-2 glass rounded-xl text-white/70 text-sm flex items-center gap-2 hover:text-white transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Report Table */}
      {report.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Employee ID', 'Name', 'Department', 'Present', 'Absent', 'Late', 'Half Day', 'Leave', 'Total Hours'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.employeeId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-primary-400 font-mono">{r.employeeId}</td>
                    <td className="py-3 px-4 text-sm text-white/80 font-medium">{r.name}</td>
                    <td className="py-3 px-4 text-sm text-white/60">{r.department}</td>
                    <td className="py-3 px-4 text-sm text-accent-400 font-medium">{r.totalPresent}</td>
                    <td className="py-3 px-4 text-sm text-danger-500 font-medium">{r.totalAbsent}</td>
                    <td className="py-3 px-4 text-sm text-warning-500 font-medium">{r.totalLate}</td>
                    <td className="py-3 px-4 text-sm text-purple-400">{r.totalHalfDay}</td>
                    <td className="py-3 px-4 text-sm text-primary-400">{r.totalLeave}</td>
                    <td className="py-3 px-4 text-sm text-white/60">{r.totalHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.length === 0 && !loading && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <BarChart3 className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30">Select a period and click Generate to view report</p>
        </div>
      )}
    </div>
  );
}
