'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Loader2, Save, User, Mail, 
  Phone, Building2, Briefcase, DollarSign 
} from 'lucide-react';

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/employees/${id}`);
        const data = await res.json();
        if (data.success) {
          setFormData(data.employee);
        } else {
          alert(data.error || 'Failed to load employee');
          router.push('/employees');
        }
      } catch (err) {
        alert('Error fetching employee information');
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/employees/${id}`);
      } else {
        alert(data.error || 'Update failed');
      }
    } catch (err) {
      alert('Network error during update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Edit Profile</h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Updating Records for {formData.firstName} {formData.lastName}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8 bg-card border border-border rounded-3xl p-8 shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <User className="w-4 h-4" /> Personal Identity
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">First Name</label>
                  <input 
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-bold"
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</label>
                  <input 
                    className="w-full p-3 bg-muted/50 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-bold"
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-bold"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Network Contact</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-bold"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Employment Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Designation</label>
                <input 
                  className="w-full p-3 bg-muted/50 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-bold"
                  value={formData.designation || ''}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Access Protocol (Role)</label>
                <select 
                  className="w-full p-3 bg-muted/50 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-bold"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="TEACHING">Teaching</option>
                  <option value="NON-TEACHING">Non-Teaching</option>
                  <option value="HOD">HOD</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fiscal Allocation (Basic)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="number"
                    className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-bold"
                    value={formData.salary.basic}
                    onChange={(e) => setFormData({...formData, salary: {...formData.salary, basic: Number(e.target.value)}})}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex justify-end gap-3">
          <button 
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 bg-muted text-foreground border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 transition-all"
          >
            Abort
          </button>
          <button 
            type="submit"
            disabled={saving}
            className="px-10 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save size={14} />}
            Commit Changes
          </button>
        </div>
      </form>
    </div>
  );
}
