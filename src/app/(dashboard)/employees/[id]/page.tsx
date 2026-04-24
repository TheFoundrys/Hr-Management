'use client';
import { useEffect, useState, use } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { User, Mail, Briefcase, Building, Edit2, Download, ArrowLeft, Loader2, Calendar, Shield, CreditCard, Clock, Globe, Printer } from 'lucide-react';
import Link from 'next/link';
import { jsPDF } from 'jspdf';

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: currentUser } = useAuthStore();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await fetch(`/api/employees/${id}`);
        const data = await res.json();
        if (data.success) setEmployee(data.employee);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  const generateIDCard = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [54, 86]
    });

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 54, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('CORPORATE ID', 27, 8, { align: 'center' });

    doc.setFillColor(240, 240, 240);
    doc.circle(27, 30, 10, 'F');

    doc.setTextColor(33, 33, 33);
    doc.setFontSize(8);
    doc.text(employee.name, 27, 45, { align: 'center' });
    doc.setFontSize(6);
    doc.text(employee.designation_name || 'Staff', 27, 48, { align: 'center' });
    doc.text(`ID: ${employee.employee_id}`, 27, 51, { align: 'center' });

    doc.setFontSize(5);
    if (employee.department_name && currentUser?.tenantType !== 'COMPANY') {
      doc.text(`Department: ${employee.department_name}`, 27, 55, { align: 'center' });
    }

    doc.rect(5, 65, 44, 15);
    doc.text('AUTHORIZED SIGNATORY', 27, 82, { align: 'center' });

    doc.save(`${employee.employee_id}_ID_Card.pdf`);
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  if (!employee) return <div className="text-center py-20 text-muted-foreground">Professional record not found.</div>;

  const isCompany = currentUser?.tenantType === 'COMPANY';

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <Link href="/employees" className="p-3 bg-muted border border-border rounded-2xl text-muted-foreground hover:text-foreground transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Professional Profile</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Institutional Ledger • {employee.name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={generateIDCard} className="flex items-center gap-2 bg-muted border border-border text-foreground px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-card transition-all shadow-sm">
            <Printer size={16} /> ID Card
          </button>
          <Link href={`/employees/${id}/edit`} className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            <Edit2 size={16} /> Edit Profile
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-[3rem] p-10 text-center space-y-6 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Globe size={120} />
             </div>
             <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] mx-auto flex items-center justify-center text-5xl font-black text-primary shadow-inner">
                {employee.name[0]}
             </div>
             <div>
                <p className="font-black text-foreground text-2xl tracking-tight">{employee.name}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1.5">{employee.employee_id}</p>
             </div>
             <div className="flex items-center justify-center gap-2">
                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                  employee.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  {employee.status}
                </span>
             </div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-6 space-y-4 shadow-sm">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Quick Contact</p>
             <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border">
                   <Mail size={18} className="text-primary" />
                   <div className="truncate">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email Address</p>
                      <p className="text-xs font-bold text-foreground truncate">{employee.email}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="lg:col-span-2 space-y-8">
           <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                 <div className="flex items-center gap-3">
                    <Briefcase size={20} className="text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Positioning</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Designation</span>
                       <span className="text-xs font-black text-foreground">{employee.designation_name || 'Staff'}</span>
                    </div>
                    {!isCompany && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Department</span>
                        <span className="text-xs font-black text-foreground">{employee.department_name || 'General'}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Access Role</span>
                       <span className="text-xs font-black text-foreground">{employee.role}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Joining Date</span>
                       <span className="text-xs font-black text-foreground">{new Date(employee.created_at).toLocaleDateString()}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                 <div className="flex items-center gap-3">
                    <Shield size={20} className="text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Hierarchy</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reporting To</span>
                       <span className="text-xs font-black text-foreground">{employee.manager_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Manager ID</span>
                       <span className="text-xs font-black text-foreground">{employee.manager_employee_id || '—'}</span>
                    </div>
                 </div>
              </div>
           </section>

           <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <CreditCard size={20} className="text-primary" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Payroll Overview</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                 {[
                    { label: 'Basic Pay', val: employee.salary?.basic || 0 },
                    { label: 'HRA Benefit', val: employee.salary?.hra || 0 },
                    { label: 'Allowances', val: employee.salary?.allowances || 0 },
                    { label: 'Deductions', val: employee.salary?.deductions || 0 }
                 ].map((p, i) => (
                    <div key={i} className="space-y-1">
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{p.label}</p>
                       <p className="text-xl font-black text-foreground">₹{Number(p.val).toLocaleString()}</p>
                    </div>
                 ))}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
