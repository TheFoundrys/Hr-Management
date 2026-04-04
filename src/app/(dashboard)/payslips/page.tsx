'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, Download, Loader2, Search, 
  ArrowRight, DollarSign, Building2, User
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Employee {
  id: string;
  universityId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    deductions: number;
  };
}

export default function DynamicPayslipsPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      const allowed = ['ADMIN', 'HR', 'HOD'].includes(user.role);
      setIsAdmin(allowed);
      fetchData(allowed);
    }
  }, [user]);

  const fetchData = async (admin: boolean) => {
    setLoading(true);
    try {
      if (admin) {
        const res = await fetch('/api/payroll/admin/payslips');
        const data = await res.json();
        if (data.success) setEmployees(data.employees);
      } else {
        const res = await fetch('/api/payroll/history');
        const data = await res.json();
        if (data.success) setMyPayslips(data.payslips);
      }
    } catch (err) {
      console.error('Failed to fetch payslip data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (emp: Employee) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text('UNIVERSITY HR MANAGEMENT', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Official Monthly Payslip', pageWidth / 2, 28, { align: 'center' });
    doc.line(20, 32, pageWidth - 20, 32);

    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Employee Name: ${emp.firstName} ${emp.lastName}`, 20, 45);
    doc.text(`Employee ID: ${emp.universityId}`, 20, 52);
    doc.text(`Department: ${emp.department}`, 20, 59);
    doc.text(`Designation: ${emp.designation}`, 20, 66);
    
    doc.text(`Pay Period: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`, pageWidth - 20, 45, { align: 'right' });

    const basic = Number(emp.salary.basic || 0);
    const hra = Number(emp.salary.hra || 0);
    const allowances = Number(emp.salary.allowances || 0);
    const deductions = Number(emp.salary.deductions || 0);

    const data = [
      ['Earnings', 'Amount (INR)', 'Deductions', 'Amount (INR)'],
      ['Basic Salary', `INR ${basic.toLocaleString()}`, 'Professional Tax', 'INR 0'],
      ['House Rent Allowance', `INR ${hra.toLocaleString()}`, 'PF / Insurance', `INR ${deductions.toLocaleString()}`],
      ['Special Allowances', `INR ${allowances.toLocaleString()}`, 'Other Deductions', 'INR 0'],
      ['', '', '', ''],
      ['Gross Earnings', `INR ${(basic + hra + allowances).toLocaleString()}`, 'Total Deductions', `INR ${deductions.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 75,
      head: [data[0]],
      body: data.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    const netSalary = (basic + hra + allowances) - deductions;
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text(`Net Pay: INR ${netSalary.toLocaleString()}`, pageWidth - 20, finalY, { align: 'right' });
    
    doc.setFontSize(9);
    doc.text(`In Words: Rupees ${netSalary.toLocaleString()} Only`, 20, finalY);
    doc.save(`Payslip_${emp.universityId}.pdf`);
  };

  const filteredEmployees = employees.filter(e => 
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.universityId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold flex items-center gap-3">
             <FileText className="w-8 h-8 text-primary" />
             Payroll Dashboard
           </h1>
           <p className="text-muted-foreground mt-1">Manage and generate monthly payslips for your entire department.</p>
        </div>
        
        {isAdmin && (
          <div className="relative w-full md:w-80 group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
             <input 
               type="text"
               placeholder="Search by name or ID..."
               className="w-full pl-10 pr-4 py-2.5 bg-card border rounded-2xl outline-none focus:ring-2 ring-primary/20 transition-all text-sm font-medium"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        )}
      </header>

      {!isAdmin ? (
         <div className="bg-card border rounded-3xl overflow-hidden shadow-xl">
           <div className="p-6 border-b">
              <h3 className="font-bold flex items-center gap-2">My Recent Payslips</h3>
           </div>
           <table className="w-full">
              <thead className="bg-muted/50">
                 <tr>
                    <th className="text-left text-xs font-bold uppercase tracking-wider py-4 px-6 text-muted-foreground">Month</th>
                    <th className="text-left text-xs font-bold uppercase tracking-wider py-4 px-6 text-muted-foreground">Net Pay</th>
                    <th className="text-right text-xs font-bold uppercase tracking-wider py-4 px-6 text-muted-foreground">Action</th>
                 </tr>
              </thead>
              <tbody>
                 {myPayslips.map(p => (
                    <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                       <td className="py-4 px-6 font-medium">{new Date(2024, p.month-1).toLocaleString('default', {month:'long'})} {p.year}</td>
                       <td className="py-4 px-6 font-black text-primary">₹{p.net_salary.toLocaleString()}</td>
                       <td className="py-4 px-6 text-right">
                          <button className="px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-secondary transition-all">Download</button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
         </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
           {filteredEmployees.map(emp => {
             const basic = Number(emp.salary.basic || 0);
             const hra = Number(emp.salary.hra || 0);
             const allowances = Number(emp.salary.allowances || 0);
             const deductions = Number(emp.salary.deductions || 0);
             const net = (basic + hra + allowances) - deductions;
             
             return (
               <div key={emp.id} className="bg-card border rounded-xl p-6 group hover:border-primary/40 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
                         {emp.firstName[0]}{emp.lastName[0]}
                       </div>
                       <div>
                          <h4 className="font-bold text-sm truncate max-w-[150px]">{emp.firstName} {emp.lastName}</h4>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{emp.universityId}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1 opacity-60">Net Pay</p>
                       <p className="text-xl font-bold text-foreground">
                         {isNaN(net) ? '₹0' : `₹${net.toLocaleString()}`}
                       </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 bg-muted/30 p-4 rounded-lg border">
                     <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-primary/60" /> {emp.department}
                        </span>
                        <span className="text-primary">{emp.designation}</span>
                     </div>
                  </div>

                  <button 
                    onClick={() => generatePDF(emp)}
                    className="w-full py-3 bg-primary text-secondary rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Download Statement
                  </button>
               </div>
             );
           })}
        </div>
      )}
    </div>
  );
}
