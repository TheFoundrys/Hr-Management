'use client';

import { useEffect, useState } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, 
  CreditCard, ShieldCheck, Edit2, Plus, Trash2, Save, X, 
  Loader2, CheckCircle2, AlertCircle, Camera, FileText,
  UserCheck, Globe, Calendar, Heart, Shield, Palette
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { AppearanceSettingsPanel } from '@/components/appearance/AppearanceSettingsPanel';

const TABS = [
  { id: 'primary', label: 'Primary Details', icon: User },
  { id: 'contact', label: 'Contact', icon: Mail },
  { id: 'address', label: 'Addresses', icon: MapPin },
  { id: 'education', label: 'Education & Work', icon: GraduationCap },
  { id: 'identity', label: 'Identity', icon: ShieldCheck },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

const InputField = ({ label, name, state, setState, isEditing, type = 'text', placeholder = '', options = null }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground ml-1">{label}</label>
    {options ? (
      <select 
        disabled={!isEditing}
        value={state[name] || ''}
        onChange={(e) => setState({ ...state, [name]: e.target.value })}
        className="w-full px-3 py-2 bg-muted/20 border border-border rounded-xl text-sm focus:ring-1 ring-primary outline-none transition-all disabled:opacity-60"
      >
        <option value="">Select {label}</option>
        {options.map((opt: any) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    ) : (
      <input 
        type={type}
        disabled={!isEditing}
        placeholder={placeholder || `-Not Set-`}
        value={state[name] || ''}
        onChange={(e) => setState({ ...state, [name]: e.target.value })}
        className="w-full px-3 py-2 bg-muted/20 border border-border rounded-xl text-sm focus:ring-1 ring-primary outline-none transition-all disabled:opacity-60"
      />
    )}
  </div>
);

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('primary');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fetchData = async () => {
    try {
      const res = await fetch('/api/employees/me');
      const data = await res.json();
      if (data.success) {
        setProfile(data.employee);
        setEditData(data.employee);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/employees/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setProfile(editData);
        setTimeout(() => setIsEditing(false), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection error.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-primary w-10 h-10" />
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Loading Profile...</p>
    </div>
  );


  return (
    <div className="w-full py-6 px-4 space-y-6">
      {/* Compact Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-3xl shrink-0">
            {profile?.name?.[0] || 'U'}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {profile?.displayName || profile?.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile?.designation} · {profile?.department}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
              <span className="px-2.5 py-1 bg-muted border border-border rounded-xl text-[10px] font-bold text-foreground uppercase tracking-wider">{profile?.employee_id}</span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={12} /> Verified
              </span>
            </div>
          </div>
          <div className="shrink-0">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm"
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setIsEditing(false); setEditData(profile); }}
                  className="px-4 py-2 border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
           {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
           <p className="font-medium">{message.text}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Section tabs — horizontal row (Keka-style), not sidebar column */}
        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex flex-row flex-nowrap gap-1 overflow-x-auto pb-2 border-b border-border [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all border border-transparent ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon size={16} className="shrink-0 opacity-80" aria-hidden />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Card */}
        <div className="w-full bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
          {activeTab === 'primary' && (
            <div className="space-y-6">
               <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold">Primary Details</h2>
                  <p className="text-sm text-muted-foreground">General identity information</p>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <InputField label="First Name" name="firstName" state={editData} setState={setEditData} isEditing={isEditing} />
                  <InputField label="Middle Name" name="middleName" state={editData} setState={setEditData} isEditing={isEditing} />
                  <InputField label="Last Name" name="lastName" state={editData} setState={setEditData} isEditing={isEditing} />
                  <InputField label="Display Name" name="displayName" state={editData} setState={setEditData} isEditing={isEditing} />
                  <InputField label="Gender" name="gender" state={editData} setState={setEditData} isEditing={isEditing} options={['Male', 'Female', 'Non-binary', 'Other']} />
                  <InputField label="Date of Birth" name="dateOfBirth" state={editData} setState={setEditData} isEditing={isEditing} type="date" />
                  <InputField label="Marital Status" name="maritalStatus" state={editData} setState={setEditData} isEditing={isEditing} options={['Single', 'Married', 'Divorced', 'Widowed']} />
                  <InputField label="Blood Group" name="bloodGroup" state={editData} setState={setEditData} isEditing={isEditing} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
                  <InputField label="Physically Handicapped" name="physicallyHandicapped" state={editData} setState={setEditData} isEditing={isEditing} options={['No', 'Yes']} />
                  <InputField label="Nationality" name="nationality" state={editData} setState={setEditData} isEditing={isEditing} />
               </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6">
               <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold">Contact Details</h2>
                  <p className="text-sm text-muted-foreground">How we can reach you</p>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <InputField label="Work Email" name="email" state={editData} setState={setEditData} isEditing={isEditing} type="email" />
                  <InputField label="Personal Email" name="personalEmail" state={editData} setState={setEditData} isEditing={isEditing} type="email" />
                  <InputField label="Mobile Number" name="phone" state={editData} setState={setEditData} isEditing={isEditing} />
                  <InputField label="Work Number" name="workPhone" state={editData} setState={setEditData} isEditing={isEditing} />
                  <InputField label="Residence Number" name="residencePhone" state={editData} setState={setEditData} isEditing={isEditing} />
               </div>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="space-y-6">
               <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold">Addresses</h2>
                  <p className="text-sm text-muted-foreground">Your residential details</p>
               </div>
               <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Current Address</label>
                    <textarea 
                      disabled={!isEditing}
                      value={editData.address || ''}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      className="w-full h-20 px-3 py-2 bg-muted/20 border border-border rounded-xl text-sm focus:ring-1 ring-primary outline-none transition-all resize-none disabled:opacity-60"
                      placeholder="Street, City, State, Zip..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Permanent Address</label>
                    <textarea 
                      disabled={!isEditing}
                      value={editData.permanentAddress || ''}
                      onChange={(e) => setEditData({ ...editData, permanentAddress: e.target.value })}
                      className="w-full h-20 px-3 py-2 bg-muted/20 border border-border rounded-xl text-sm focus:ring-1 ring-primary outline-none transition-all resize-none disabled:opacity-60"
                      placeholder="Street, City, State, Zip..."
                    />
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'education' && (
            <div className="space-y-6">
               <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold">Education & Work</h2>
                  <p className="text-sm text-muted-foreground">Professional background</p>
               </div>
               
               <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Professional Summary</label>
                    <textarea 
                      disabled={!isEditing}
                      value={editData.professionalSummary || ''}
                      onChange={(e) => setEditData({ ...editData, professionalSummary: e.target.value })}
                      className="w-full h-24 px-3 py-2 bg-muted/20 border border-border rounded-xl text-sm focus:ring-1 ring-primary outline-none transition-all resize-none disabled:opacity-60"
                      placeholder="Brief overview of your career..."
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Academic Qualifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-border rounded-xl bg-muted/10">
                        <InputField label="Degree" name="eduDegree" state={editData} setState={setEditData} isEditing={isEditing} />
                       <InputField label="Institution" name="eduUni" state={editData} setState={setEditData} isEditing={isEditing} />
                       <InputField label="Specialization" name="eduBranch" state={editData} setState={setEditData} isEditing={isEditing} />
                       <InputField label="CGPA / %" name="eduCgpa" state={editData} setState={setEditData} isEditing={isEditing} />
                       <InputField label="Year of Joining" name="eduJoin" state={editData} setState={setEditData} isEditing={isEditing} type="number" />
                       <InputField label="Year of Completion" name="eduEnd" state={editData} setState={setEditData} isEditing={isEditing} type="number" />
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="space-y-6">
               <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold">Identity Information</h2>
                  <p className="text-sm text-muted-foreground">Government documents</p>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-5 border border-border rounded-xl bg-muted/10 space-y-4">
                     <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck size={18} />
                        <h3 className="text-sm font-bold">Aadhaar Card</h3>
                     </div>
                      <InputField label="Number" name="aadhaarNumber" state={editData} setState={setEditData} isEditing={isEditing} />
                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} /> Verified
                     </div>
                  </div>
                  <div className="p-5 border border-border rounded-xl bg-muted/10 space-y-4">
                     <div className="flex items-center gap-2 text-primary">
                        <CreditCard size={18} />
                        <h3 className="text-sm font-bold">PAN Card</h3>
                     </div>
                      <InputField label="Number" name="panNumber" state={editData} setState={setEditData} isEditing={isEditing} />
                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} /> Verified
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-lg font-bold">Appearance &amp; theme</h2>
                <p className="text-sm text-muted-foreground">Same options as under Settings → Appearance in the sidebar.</p>
              </div>
              <AppearanceSettingsPanel showIntro={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
