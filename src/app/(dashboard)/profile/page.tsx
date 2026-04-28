'use client';

import { useEffect, useState } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, 
  CreditCard, ShieldCheck, Edit2, Plus, Trash2, Save, X, 
  Loader2, CheckCircle2, AlertCircle, Camera, FileText,
  UserCheck, Globe, Calendar, Heart, Shield
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

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

  const TABS = [
    { id: 'primary', label: 'Primary Details', icon: User },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'address', label: 'Addresses', icon: MapPin },
    { id: 'education', label: 'Education & Work', icon: GraduationCap },
    { id: 'identity', label: 'Identity', icon: ShieldCheck },
  ];

  const InputField = ({ label, name, type = 'text', placeholder = '', options = null }: any) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground ml-1">{label}</label>
      {options ? (
        <select 
          disabled={!isEditing}
          value={editData[name] || ''}
          onChange={(e) => setEditData({ ...editData, [name]: e.target.value })}
          className="w-full px-3 py-2 bg-muted/20 border border-border rounded-lg text-sm focus:ring-1 ring-primary outline-none transition-all disabled:opacity-60"
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
          value={editData[name] || ''}
          onChange={(e) => setEditData({ ...editData, [name]: e.target.value })}
          className="w-full px-3 py-2 bg-muted/20 border border-border rounded-lg text-sm focus:ring-1 ring-primary outline-none transition-all disabled:opacity-60"
        />
      )}
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
              {profile?.designation} • {profile?.department}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
              <span className="px-2.5 py-1 bg-muted border border-border rounded-md text-[10px] font-bold text-foreground uppercase tracking-wider">{profile?.employee_id}</span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={12} /> Verified
              </span>
            </div>
          </div>
          <div className="shrink-0">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm"
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setIsEditing(false); setEditData(profile); }}
                  className="px-4 py-2 border border-border text-foreground rounded-lg font-semibold text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 shadow-sm disabled:opacity-50"
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
        <div className={`p-3 rounded-lg flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
           {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
           <p className="font-medium">{message.text}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Tabs */}
        <div className="md:w-56 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Card */}
        <div className="flex-1 bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
          {activeTab === 'primary' && (
            <div className="space-y-6">
               <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold">Primary Details</h2>
                  <p className="text-sm text-muted-foreground">General identity information</p>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InputField label="First Name" name="firstName" />
                  <InputField label="Middle Name" name="middleName" />
                  <InputField label="Last Name" name="lastName" />
                  <InputField label="Display Name" name="displayName" />
                  <InputField label="Gender" name="gender" options={['Male', 'Female', 'Non-binary', 'Other']} />
                  <InputField label="Date of Birth" name="dateOfBirth" type="date" />
                  <InputField label="Marital Status" name="maritalStatus" options={['Single', 'Married', 'Divorced', 'Widowed']} />
                  <InputField label="Blood Group" name="bloodGroup" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
                  <InputField label="Physically Handicapped" name="physicallyHandicapped" options={['No', 'Yes']} />
                  <InputField label="Nationality" name="nationality" />
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
                  <InputField label="Work Email" name="email" type="email" />
                  <InputField label="Personal Email" name="personalEmail" type="email" />
                  <InputField label="Mobile Number" name="phone" />
                  <InputField label="Work Number" name="workPhone" />
                  <InputField label="Residence Number" name="residencePhone" />
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
                      className="w-full h-20 px-3 py-2 bg-muted/20 border border-border rounded-lg text-sm focus:ring-1 ring-primary outline-none transition-all resize-none disabled:opacity-60"
                      placeholder="Street, City, State, Zip..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Permanent Address</label>
                    <textarea 
                      disabled={!isEditing}
                      value={editData.permanentAddress || ''}
                      onChange={(e) => setEditData({ ...editData, permanentAddress: e.target.value })}
                      className="w-full h-20 px-3 py-2 bg-muted/20 border border-border rounded-lg text-sm focus:ring-1 ring-primary outline-none transition-all resize-none disabled:opacity-60"
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
                      className="w-full h-24 px-3 py-2 bg-muted/20 border border-border rounded-lg text-sm focus:ring-1 ring-primary outline-none transition-all resize-none disabled:opacity-60"
                      placeholder="Brief overview of your career..."
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Academic Qualifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-border rounded-lg bg-muted/10">
                       <InputField label="Degree" name="eduDegree" />
                       <InputField label="Institution" name="eduUni" />
                       <InputField label="Specialization" name="eduBranch" />
                       <InputField label="CGPA / %" name="eduCgpa" />
                       <InputField label="Year of Joining" name="eduJoin" type="number" />
                       <InputField label="Year of Completion" name="eduEnd" type="number" />
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
                  <div className="p-5 border border-border rounded-lg bg-muted/10 space-y-4">
                     <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck size={18} />
                        <h3 className="text-sm font-bold">Aadhaar Card</h3>
                     </div>
                     <InputField label="Number" name="aadhaarNumber" />
                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} /> Verified
                     </div>
                  </div>
                  <div className="p-5 border border-border rounded-lg bg-muted/10 space-y-4">
                     <div className="flex items-center gap-2 text-primary">
                        <CreditCard size={18} />
                        <h3 className="text-sm font-bold">PAN Card</h3>
                     </div>
                     <InputField label="Number" name="panNumber" />
                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} /> Verified
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
