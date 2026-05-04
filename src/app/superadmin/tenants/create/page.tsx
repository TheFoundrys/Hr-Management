'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Mail, Lock, User, CheckCircle2, ChevronLeft, 
  Loader2, Sparkles, Globe, MapPin, Users, Layers,
  Layout, ShieldCheck, Box
} from 'lucide-react';
import Link from 'next/link';

export default function CreateTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    org: {
      name: '',
      org_type: 'corporate',
      domain: '',
      org_size: 50,
      address: '',
      country: 'India',
      timezone: 'Asia/Kolkata',
      logo_url: ''
    },
    admin: {
      full_name: '',
      email: '',
      password: '',
      designation: 'Administrator'
    },
    hierarchy: {
      reporting_type: 'linear',
      require_dept_head: true,
      label_vocabulary: 'corporate',
      custom_labels: {}
    },
    modules: {
      leave: true,
      attendance: true,
      payroll: true,
      performance: false,
      recruitment: false,
      documents: true
    },
    structure: {
      source: 'template',
      template_id: ''
    }
  });

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch('/api/superadmin/templates');
        const data = await res.json();
        if (data.success) {
          setTemplates(data.templates);
          if (data.templates.length > 0) {
            setFormData(prev => ({
              ...prev,
              structure: { ...prev.structure, template_id: data.templates[0].id }
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    }
    loadTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tenants/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to onboard tenant');

      router.push('/superadmin/tenants');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrg = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, org: { ...prev.org, [field]: value } }));
  };

  const updateAdmin = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, admin: { ...prev.admin, [field]: value } }));
  };

  const updateHierarchy = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, hierarchy: { ...prev.hierarchy, [field]: value } }));
  };

  const toggleModule = (module: string) => {
    setFormData(prev => ({ 
      ...prev, 
      modules: { ...prev.modules, [module as keyof typeof prev.modules]: !prev.modules[module as keyof typeof prev.modules] } 
    }));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-700 pb-20">
      <Link 
        href="/superadmin/tenants" 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group w-fit"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Back to Systems</span>
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black text-foreground tracking-tighter">Strategic Onboarding</h1>
        <p className="text-muted-foreground font-medium flex items-center gap-2">
           Provisioning high-fidelity, sector-specific HR environments at scale.
           <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/20" />
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Section 1: Identity & Context */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border p-8 rounded-xl shadow-2xl space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-4 -mt-4">
                  <Globe className="w-48 h-48 rotate-12" />
               </div>

               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary">
                    <span className="text-xl font-black">01</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Organization Identity</h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Basic metadata and regional context</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Legal Entity Name</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        required
                        placeholder="e.g. Apollo Hospitals"
                        value={formData.org.name}
                        onChange={(e) => updateOrg('name', e.target.value)}
                        className="w-full bg-muted/20 border border-border focus:border-primary/50 px-11 py-3.5 rounded-xl outline-none transition-all font-bold text-sm"
                      />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sector / Org Type</label>
                    <div className="relative group">
                      <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        required
                        placeholder="e.g. hospital, university, pharma"
                        value={formData.org.org_type}
                        onChange={(e) => updateOrg('org_type', e.target.value.toLowerCase())}
                        className="w-full bg-muted/20 border border-border focus:border-primary/50 px-11 py-3.5 rounded-xl outline-none transition-all font-bold text-sm"
                      />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Domain</label>
                    <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        required
                        placeholder="apollo.com"
                        value={formData.org.domain}
                        onChange={(e) => updateOrg('domain', e.target.value)}
                        className="w-full bg-muted/20 border border-border focus:border-primary/50 px-11 py-3.5 rounded-xl outline-none transition-all font-bold text-sm"
                      />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Workforce Size</label>
                    <div className="relative group">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        required
                        type="number"
                        value={formData.org.org_size}
                        onChange={(e) => updateOrg('org_size', parseInt(e.target.value))}
                        className="w-full bg-muted/20 border border-border focus:border-primary/50 px-11 py-3.5 rounded-xl outline-none transition-all font-bold text-sm"
                      />
                    </div>
                 </div>

                 <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Headquarters Address</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        required
                        placeholder="Street, City, Country"
                        value={formData.org.address}
                        onChange={(e) => updateOrg('address', e.target.value)}
                        className="w-full bg-muted/20 border border-border focus:border-primary/50 px-11 py-3.5 rounded-xl outline-none transition-all font-bold text-sm"
                      />
                    </div>
                 </div>
               </div>
            </div>

            {/* Section 2: Administrative Control */}
            <div className="bg-card border border-border p-8 rounded-xl shadow-2xl space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-4 -mt-4">
                  <ShieldCheck className="w-48 h-48 -rotate-12" />
               </div>

               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <span className="text-xl font-black">02</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Root Administrator</h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Tenant-level superuser credentials</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Legal Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                      <input
                        required
                        placeholder="John Doe"
                        value={formData.admin.full_name}
                        onChange={(e) => updateAdmin('full_name', e.target.value)}
                        className="w-full bg-muted/20 border border-border focus:border-amber-500/50 px-11 py-3.5 rounded-xl outline-none transition-all font-bold text-sm"
                      />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Corporate Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                      <input
                        required
                        type="email"
                        placeholder="admin@apollo.com"
                        value={formData.admin.email}
                        onChange={(e) => updateAdmin('email', e.target.value)}
                        className="w-full bg-muted/20 border border-border focus:border-amber-500/50 px-11 py-3.5 rounded-xl outline-none transition-all font-bold text-sm"
                      />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Secure Passphrase</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        value={formData.admin.password}
                        onChange={(e) => updateAdmin('password', e.target.value)}
                        className="w-full bg-muted/20 border border-border focus:border-amber-500/50 px-11 py-3.5 rounded-xl outline-none transition-all font-bold text-sm"
                      />
                    </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Section 3: Architecture & Structure (Sidebar-style) */}
          <div className="space-y-8">
            <div className="bg-muted/30 border border-border p-6 rounded-xl space-y-8 h-full">
              
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <span className="text-lg font-black">03</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight">Architecture</h2>
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Model & Feature Blueprint</p>
                  </div>
               </div>

               {/* Template Selection */}
               <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Import Hierarchy Template</label>
                 <div className="grid grid-cols-1 gap-3">
                   {templates.map((t) => (
                     <div 
                        key={t.id}
                        onClick={() => setFormData(prev => ({ ...prev, structure: { ...prev.structure, template_id: t.id } }))}
                        className={`p-4 border transition-all cursor-pointer group relative ${
                          formData.structure.template_id === t.id 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                          : 'border-border bg-card hover:border-primary/30'
                        }`}
                     >
                       <div className="flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-tight">{t.name}</p>
                          <CheckCircle2 className={`w-4 h-4 ${formData.structure.template_id === t.id ? 'text-primary' : 'text-transparent'}`} />
                       </div>
                       <p className="text-[9px] text-muted-foreground mt-1 font-bold italic">{t.org_type}</p>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Reporting Logic */}
               <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reporting Type</label>
                 <div className="flex gap-2">
                   {['linear', 'matrix'].map((type) => (
                     <button
                        key={type}
                        type="button"
                        onClick={() => updateHierarchy('reporting_type', type)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${
                          formData.hierarchy.reporting_type === type 
                          ? 'bg-foreground text-background border-foreground' 
                          : 'bg-card text-muted-foreground border-border hover:border-foreground'
                        }`}
                     >
                        {type}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Module Toggles */}
               <div className="space-y-4 pt-4 border-t border-border">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Enabled Modules</label>
                 <div className="space-y-2">
                   {Object.entries(formData.modules).map(([module, enabled]) => (
                     <div 
                        key={module}
                        onClick={() => toggleModule(module)}
                        className="flex items-center justify-between p-3 bg-card border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                     >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">{module.replace(/_/g, ' ')}</span>
                        <div className={`w-8 h-4 rounded-full transition-all relative ${enabled ? 'bg-emerald-500' : 'bg-muted'}`}>
                           <div className={`absolute top-1 w-2 h-2 bg-white transition-all ${enabled ? 'right-1' : 'left-1'}`} />
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-6 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {error}
          </div>
        )}

        <button
          disabled={loading}
          type="submit"
          className={`w-full py-6 rounded-xl font-black text-xl uppercase tracking-tighter transition-all flex items-center justify-center gap-4 shadow-2xl
            ${loading ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'}
          `}
        >
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              Deploy Institutional Cloud Instance
              <Sparkles className="w-6 h-6 fill-primary-foreground/20" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
