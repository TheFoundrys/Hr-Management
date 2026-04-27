'use client';
import { useEffect, useState } from 'react';
import { FileText, Download, Loader2, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DynamicPayslipsPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const isAdmin = ['ADMIN', 'HR', 'HOD', 'STAFF'].includes(user?.role || '');

  useEffect(() => {
    if (!user) return;
    const url = isAdmin ? '/api/payroll/admin/payslips' : '/api/payroll/history';
    fetch(url).then(r => r.json()).then(d => {
      if (d.success) isAdmin ? setEmployees(d.employees) : setMyPayslips(d.payslips);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user, isAdmin]);

  const dl = (emp: any) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    doc.setFontSize(20).setTextColor(43, 108, 176).text('UNIVERSITY HR MANAGEMENT', pw/2, 20, { align: 'center' });
    doc.setFontSize(10).setTextColor(100).text('Official Monthly Payslip', pw/2, 28, { align: 'center' });
    doc.text(`Name: ${emp.firstName} ${emp.lastName}\nID: ${emp.universityId}\nDept: ${emp.department}`, 20, 45);
    doc.text(`Period: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`, pw-20, 45, { align: 'right' });
    
    const s = (v: any) => Number(v || 0);
    const [b, h, a, d] = [s(emp.salary?.basic), s(emp.salary?.hra), s(emp.salary?.allowances), s(emp.salary?.deductions)];
    autoTable(doc, {
      startY: 70, headStyles: { fillColor: [43, 108, 176] },
      head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
      body: [['Basic', `INR ${b}`, 'PF/Insurance', `INR ${d}`], ['HRA', `INR ${h}`, '', ''], ['Allowances', `INR ${a}`, '', ''], ['Total', `INR ${b+h+a}`, 'Total', `INR ${d}`]]
    });
    
    doc.setFontSize(14).setTextColor(43, 108, 176).text(`Net Pay: INR ${b+h+a-d}`, pw-20, (doc as any).lastAutoTable.finalY + 15, { align: 'right' });
    doc.save(`Payslip_${emp.universityId}.pdf`);
  };

  const filtered = employees.filter(e => JSON.stringify(e).toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-8 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3 uppercase tracking-tight">
            <FileText className="w-7 h-7 text-primary"/> Financial Management
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 leading-none">Institutional Payroll Protocol</p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-4 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Filter Employees..." 
              onChange={e => setSearch(e.target.value)} 
              className="bg-card border border-border rounded-xl px-5 py-2.5 text-xs text-foreground focus:border-primary outline-none w-full md:w-64 shadow-soft transition-all" 
            />
            <button 
              onClick={async () => {
                if(!confirm('Begin bulk payroll generation for current cycle?')) return;
                const res = await fetch('/api/payroll', {
                  method: 'POST',
                  body: JSON.stringify({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })
                });
                const data = await res.json();
                if(data.success) {
                  alert(`Success: ${data.message}`);
                  window.location.reload();
                } else {
                  alert(data.error);
                }
              }}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-soft min-w-fit"
            >
              Run Payroll Cycle
            </button>
          </div>
        )}
      </header>

      {!isAdmin ? (
         <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
           <table className="w-full text-left text-sm">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                 <tr>{['Month', 'Net Pay', 'Action'].map(h => <th key={h} className="p-4">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                 {myPayslips.map(p => (
                    <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                       <td className="p-4 font-bold">{new Date(2024, p.month-1).toLocaleString('default', {month:'long'})} {p.year}</td>
                       <td className="p-4 text-primary font-black">₹{p.net_salary.toLocaleString()}</td>
                       <td className="p-4"><button className="bg-muted text-foreground border border-border px-6 py-2 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors">Download</button></td>
                    </tr>
                 ))}
                 {!myPayslips.length && <tr><td colSpan={3} className="p-12 text-center text-muted-foreground italic">No payslips found on record.</td></tr>}
              </tbody>
           </table>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filtered.map(emp => {
             const s = (v: any) => Number(v || 0);
             const net = s(emp.salary?.basic) + s(emp.salary?.hra) + s(emp.salary?.allowances) - s(emp.salary?.deductions);
             return (
               <div key={emp.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all shadow-soft flex flex-col justify-between">
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex justify-center items-center font-bold text-lg">
                           {(emp.firstName?.[0] || 'U')}{(emp.lastName?.[0] || 'N')}
                         </div>
                         <div>
                            <h4 className="font-bold text-sm text-foreground leading-tight">{emp.firstName || 'Unknown'} {emp.lastName || 'User'}</h4>
                            <p className="text-xs text-muted-foreground font-mono mt-1">{emp.universityId}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="flex flex-col items-end gap-1">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                             emp.payslipStatus === 'generated' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
                           }`}>
                             {emp.payslipStatus === 'generated' ? 'Processed' : 'Cycle Pending'}
                           </span>
                           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">Net Allocation</p>
                           <p className="text-lg font-black text-primary">₹{(emp.actualNet || net).toLocaleString()}</p>
                         </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground bg-muted p-3 rounded-xl border border-border">{emp.department} • <span className="text-foreground font-bold">{emp.designation}</span></div>
                  </div>
                  <button onClick={() => dl(emp)} className="w-full py-3 bg-muted text-foreground border border-border rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground flex justify-center items-center gap-2 transition-colors"><Download size={14}/> Generate Statement</button>
               </div>
             );
           })}
        </div>
      )}
    </div>
  );
}
