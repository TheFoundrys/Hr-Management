'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Mail, Phone, Building2, MapPin, 
  Calendar, DollarSign, ArrowLeft, Loader2,
  Briefcase, GraduationCap, ShieldCheck,
  CreditCard, LayoutDashboard, Settings, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Employee {
  id: string;
  universityId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  designation: string;
  managerName: string;
  joinDate: string;
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    deductions: number;
  };
}

export default function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit Form State
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/employees/${id}`);
        const data = await res.json();
        if (data.success) {
          setEmployee(data.employee);
          setFormData(data.employee);
        } else {
          setError(data.error || 'Failed to load employee details');
        }
      } catch (err) {
        setError('Error fetching employee information');
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        // Reflect changes locally
        setEmployee({
          ...employee!,
          ...formData
        });
        setIsEditModalOpen(false);
      } else {
        alert(data.error || 'Update failed');
      }
    } catch (err) {
      alert('Network error during update');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    if (!employee) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text('UNIVERSITY HR MANAGEMENT', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Official Monthly Payslip', pageWidth / 2, 28, { align: 'center' });
    doc.line(20, 32, pageWidth - 20, 32);

    // Employee Info Box
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Employee Name: ${employee.firstName} ${employee.lastName}`, 20, 45);
    doc.text(`Employee ID: ${employee.universityId}`, 20, 52);
    doc.text(`Department: ${employee.department}`, 20, 59);
    doc.text(`Designation: ${employee.designation}`, 20, 66);
    
    doc.text(`Pay Period: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`, pageWidth - 20, 45, { align: 'right' });
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, pageWidth - 20, 52, { align: 'right' });

    // Table
    const data = [
      ['Earnings', 'Amount (INR)', 'Deductions', 'Amount (INR)'],
      ['Basic Salary', `INR ${employee.salary.basic.toLocaleString()}`, 'Professional Tax', 'INR 0'],
      ['House Rent Allowance', `INR ${employee.salary.hra.toLocaleString()}`, 'PF / Insurance', `INR ${employee.salary.deductions.toLocaleString()}`],
      ['Special Allowances', `INR ${employee.salary.allowances.toLocaleString()}`, 'Other Deductions', 'INR 0'],
      ['', '', '', ''],
      ['Gross Earnings', `INR ${(employee.salary.basic + employee.salary.hra + employee.salary.allowances).toLocaleString()}`, 'Total Deductions', `INR ${employee.salary.deductions.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 75,
      head: [data[0]],
      body: data.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 5 }
    });

    const netSalary = (employee.salary.basic + employee.salary.hra + employee.salary.allowances) - employee.salary.deductions;
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text(`Net Pay: INR ${netSalary.toLocaleString()}`, pageWidth - 20, finalY, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    const words = `In Words: Rupees ${netSalary.toLocaleString()} Only`;
    doc.text(words, 20, finalY);

    // Footer
    doc.setFontSize(8);
    doc.text('This is a computer generated payslip and does not require a physical signature.', pageWidth / 2, 280, { align: 'center' });

    doc.save(`Payslip_${employee.universityId}_${Date.now()}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-xl m-8">
        <p className="text-destructive font-medium text-lg mb-4">{error || 'Employee not found'}</p>
        <button 
          onClick={() => router.push('/employees')}
          className="px-6 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-all font-medium"
        >
          Back to Employee List
        </button>
      </div>
    );
  }

  const totalMonthly = (employee.salary.basic + employee.salary.hra + employee.salary.allowances) - employee.salary.deductions;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/employees')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{employee.firstName} {employee.lastName}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold">{employee.universityId}</span>
              • {employee.designation} • {employee.department}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => router.push(`/employees/${id}/edit`)}
            className="px-4 py-2 border border-primary/20 rounded-lg hover:bg-primary/5 transition-all text-sm font-medium"
           >
            Edit Profile
           </button>
           <button className="px-4 py-2 bg-primary text-secondary rounded-lg font-medium text-sm">Download ID</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Key Stats & Photo */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-card glassmorphic-card p-6 border rounded-2xl flex flex-col items-center text-center">
             <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-xl">
               {employee.firstName[0]}{employee.lastName[0]}
             </div>
             <h2 className="text-xl font-bold">{employee.firstName} {employee.lastName}</h2>
             <p className="text-sm text-muted-foreground mb-4">{employee.role}</p>
             <div className="w-full flex items-center justify-center gap-3 py-3 border-y border-border/50">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
               <span className="text-xs font-medium uppercase tracking-wider text-emerald-500">Active Employment</span>
             </div>
             <div className="grid grid-cols-2 gap-4 w-full mt-6">
                 <div className="p-3 bg-muted/30 rounded-xl">
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Efficiency</p>
                   <p className="text-lg font-bold text-primary">{(employee as any).metrics?.efficiency || 100}%</p>
                 </div>
                 <div className="p-3 bg-muted/30 rounded-xl">
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Attendance</p>
                   <p className="text-lg font-bold text-primary">{(employee as any).metrics?.attendance || 100}%</p>
                 </div>
             </div>
          </div>

          <div className="bg-card glassmorphic-card p-6 border rounded-2xl space-y-4">
             <h3 className="font-bold border-b pb-2 flex items-center gap-2">
               <Briefcase className="w-4 h-4 text-primary" />
               Work Information
             </h3>
             <ul className="space-y-3">
               <li className="flex justify-between items-center text-sm">
                 <span className="text-muted-foreground flex items-center gap-2 font-medium">Department</span>
                 <span className="font-semibold text-foreground">{employee.department}</span>
               </li>
               <li className="flex justify-between items-center text-sm">
                 <span className="text-muted-foreground flex items-center gap-2 font-medium">Reporting To</span>
                 <span className="font-semibold text-foreground">{employee.managerName || 'None'}</span>
               </li>
               <li className="flex justify-between items-center text-sm">
                 <span className="text-muted-foreground flex items-center gap-2 font-medium">Joining Date</span>
                 <span className="font-semibold text-foreground">{new Date(employee.joinDate).toLocaleDateString()}</span>
               </li>
             </ul>
          </div>
        </div>

        {/* Middle & Right Column: Details & Salary */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-card glassmorphic-card p-6 border rounded-2xl">
             <h3 className="font-bold border-b pb-4 mb-6 flex items-center gap-2">
               <User className="w-4 h-4 text-primary" />
               Personal Information
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
               <div className="space-y-1">
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Full Name</p>
                 <p className="font-medium text-lg">{employee.firstName} {employee.lastName}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Email Address</p>
                 <div className="flex items-center gap-2 text-primary font-medium text-lg">
                   <Mail className="w-4 h-4" />
                   {employee.email}
                 </div>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Mobile Number</p>
                 <div className="flex items-center gap-2 text-foreground font-medium text-lg">
                   <Phone className="w-4 h-4 text-muted-foreground" />
                   {employee.phone || 'Not Provided'}
                 </div>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Official ID</p>
                 <p className="font-medium text-lg tracking-wider font-mono bg-muted/40 px-3 py-0.5 rounded w-fit">{employee.universityId}</p>
             </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-card glassmorphic-card p-6 border rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
                  <h3 className="font-bold border-b pb-4 mb-6 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Consolidated Salary
                  </h3>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/10">
                      <p className="text-sm font-semibold">Net Take Home</p>
                      <p className="text-2xl font-black text-primary">₹{totalMonthly.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2 text-sm pt-4">
                      <div className="flex justify-between text-muted-foreground">
                         <span>Basic Pay</span>
                         <span className="font-semibold text-foreground">₹{employee.salary.basic.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                         <span>HRA</span>
                         <span className="font-semibold text-foreground">₹{employee.salary.hra.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                         <span>Spl. Allowances</span>
                         <span className="font-semibold text-foreground">₹{employee.salary.allowances.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-red-500/80 pt-2 border-t mt-2">
                         <span className="font-medium">Total Deductions</span>
                         <span className="font-bold">-₹{employee.salary.deductions.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
               </div>        </div>

              <div className="bg-card glassmorphic-card p-6 border rounded-2xl space-y-6">
                <h3 className="font-bold border-b pb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Banking Details
                </h3>
                <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-white flex items-center justify-center rounded-lg shadow-sm border border-border">
                    <span className="text-[10px] font-black italic text-primary">BANK</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">State Bank of India</p>
                    <p className="text-xs text-muted-foreground font-mono">XXXX-XXXX-XX94</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={generatePDF}
                    className="w-full py-2.5 text-secondary bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download Payslip
                  </button>
                  <button className="w-full py-2.5 text-primary bg-primary/10 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/20 transition-all border border-primary/20">View Tax Report</button>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
