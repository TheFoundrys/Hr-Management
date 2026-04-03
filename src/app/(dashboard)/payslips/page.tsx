'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

interface Payslip {
  id: string;
  month: number;
  year: number;
  net_salary: number;
  status: string;
  generated_at: string;
}

export default function PayslipsPage() {
  const { user } = useAuthStore();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayslips();
  }, [user]);

  const fetchPayslips = async () => {
    try {
      const res = await fetch('/api/payroll/history');
      const json = await res.json();
      if (json.success) setPayslips(json.payslips);
    } catch (err) {
      console.error('Payslips fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1).toLocaleString('default', { month: 'long' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary-400" /> My Payslips
        </h1>
        <p className="text-white/40 text-sm mt-1">View and download your monthly salary statements</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-medium text-white/40 py-4 px-6 uppercase tracking-wider">Month / Year</th>
              <th className="text-left text-xs font-medium text-white/40 py-4 px-6 uppercase tracking-wider">Net Salary</th>
              <th className="text-left text-xs font-medium text-white/40 py-4 px-6 uppercase tracking-wider">Status</th>
              <th className="text-right text-xs font-medium text-white/40 py-4 px-6 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="py-4 px-6">
                  <p className="text-sm font-medium text-white">{getMonthName(p.month)} {p.year}</p>
                  <p className="text-[10px] text-white/30">Generated on {new Date(p.generated_at).toLocaleDateString()}</p>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-mono text-primary-400">₹{Number(p.net_salary).toLocaleString('en-IN')}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-accent-500/10 text-accent-400">
                    {p.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button 
                    className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-white/20">
                    <FileText className="w-10 h-10" />
                    <p>No payslips generated yet</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
