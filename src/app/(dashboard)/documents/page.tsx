'use client';

import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Trash2, Loader2, FolderOpen, Link2, Copy, CheckCircle2, Clock, Eye, XCircle, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { hasPermission } from '@/lib/auth/rbac';

interface DocRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  category: string;
  uploaded_by: string;
  created_at: string;
}

interface OnboardingLink {
  id: string;
  token: string;
  link_type: string;
  status: string;
  expires_at: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  emp_code?: string;
  created_by_name?: string;
  submission_count: string;
}

interface OnboardingDocument {
  id: string;
  doc_type: string;
  file_name: string;
  file_size: number;
}

interface Submission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  status: string;
  submitted_at: string;
  link_type: string;
  documents: OnboardingDocument[] | null;
}

const CATEGORIES = ['ID_PROOF', 'CERTIFICATE', 'PAYSLIP', 'CONTRACT', 'RESUME', 'OTHER'];
type PageTab = 'repository' | 'onboarding';

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const isHR = ['ADMIN', 'HR', 'HR_MANAGER', 'SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user?.role || '');

  const [pageTab, setPageTab] = useState<PageTab>('repository');
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('');
  const [uploadForm, setUploadForm] = useState({ userId: '', category: 'OTHER' });
  const fileRef = useRef<HTMLInputElement>(null);

  // Onboarding state
  const [links, setLinks] = useState<OnboardingLink[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [onbTab, setOnbTab] = useState<'links' | 'submissions'>('links');
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());

  useEffect(() => { if (pageTab === 'repository') fetchDocs(); }, [category, pageTab]);
  useEffect(() => { if (pageTab === 'onboarding') { fetchLinks(); fetchSubmissions(); } }, [pageTab]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      if (data.success) setDocs(data.documents || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadForm.userId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', uploadForm.userId);
      formData.append('category', uploadForm.category);
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      if (res.ok) { fetchDocs(); if (fileRef.current) fileRef.current.value = ''; }
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      fetchDocs();
    } catch (err) { console.error(err); }
  };

  const formatSize = (bytes: any) => {
    const b = Number(bytes || 0);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Onboarding functions
  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/onboarding/links');
      const data = await res.json();
      if (data.success) setLinks(data.links);
    } catch (err) { console.error(err); }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/onboarding/submissions');
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions);
    } catch (err) { console.error(err); }
  };

  const generateLink = async (type: 'generic' | 'specific') => {
    setGenerating(true);
    try {
      const res = await fetch('/api/onboarding/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkType: type })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedLink(data.link);
        fetchLinks();
      } else {
        alert(data.error || 'Failed to generate link');
      }
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateSubmissionStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await fetch('/api/onboarding/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id, status })
      });
      fetchSubmissions();
    } catch (err) { console.error(err); }
  };

  const toggleSubmissionExpand = (id: string) => {
    setExpandedSubmissions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const DOC_TYPE_LABELS: Record<string, string> = {
    aadharPan: 'Aadhar / PAN',
    payslips: 'Payslips',
    educationalCertificates: 'Educational Certificates',
    previousOfferLetter: 'Previous Offer Letter',
    relievingExperienceLetters: 'Relieving / Experience Letters',
    appraisalHikeLetters: 'Appraisal / Hike Letters',
    photo: 'Photo',
    resume: 'Resume',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tighter flex items-center gap-4">
            <FileText size={40} className="text-primary" /> Documents
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
            Document management, onboarding & personnel records
          </p>
        </div>
      </header>

      {/* Page Tabs */}
      <div className="flex gap-0 border-b border-border">
        <button onClick={() => setPageTab('repository')}
          className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest relative transition-colors ${pageTab === 'repository' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          Repository
          {pageTab === 'repository' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        {isHR && (
          <button onClick={() => setPageTab('onboarding')}
            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest relative transition-colors ${pageTab === 'onboarding' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            Onboarding
            {pageTab === 'onboarding' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        )}
      </div>

      {/* REPOSITORY TAB */}
      {pageTab === 'repository' && (
        <div className="space-y-8">
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              <Upload size={16} strokeWidth={3} /> {uploading ? 'Syncing...' : 'Upload Asset'}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          </div>

          <div className="bg-card border border-border p-8 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Target Identity</label>
              <input type="text" value={uploadForm.userId} onChange={(e) => setUploadForm({ ...uploadForm, userId: e.target.value })}
                className="w-full bg-muted/40 border border-border px-4 py-2.5 text-xs font-bold uppercase outline-none focus:border-primary transition-all" placeholder="EMP-001" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Classification</label>
              <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                className="w-full bg-muted/40 border border-border px-4 py-2.5 text-xs font-bold uppercase outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-1 border-b border-border bg-muted/20 p-1">
            <button onClick={() => setCategory('')}
              className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${!category ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>All</button>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${category === c ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>{c.replace('_', ' ')}</button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground opacity-20">
                <FolderOpen size={64} className="mb-4" />
                <p className="text-xl font-black uppercase tracking-tighter">No Assets Found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-border">
                      <th className="px-8 py-5">Asset Descriptor</th>
                      <th className="px-8 py-5">Classification</th>
                      <th className="px-8 py-5">Metadata</th>
                      <th className="px-8 py-5">Uploaded At</th>
                      <th className="px-8 py-5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {docs.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary"><FileText size={18} /></div>
                            <div>
                              <p className="text-xs font-black text-foreground uppercase tracking-tight">{d.file_name}</p>
                              <p className="text-[9px] text-primary font-bold uppercase tracking-widest">{d.user_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6"><span className="text-[9px] px-3 py-1 bg-muted font-black uppercase tracking-widest">{d.category}</span></td>
                        <td className="px-8 py-6">
                          <p className="text-[10px] font-bold text-foreground uppercase">{formatSize(d.file_size)}</p>
                          <p className="text-[9px] text-muted-foreground font-medium uppercase">{d.file_type}</p>
                        </td>
                        <td className="px-8 py-6 text-[10px] font-bold text-muted-foreground uppercase">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => handleDelete(d.id)} className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ONBOARDING TAB */}
      {pageTab === 'onboarding' && (
        <div className="space-y-8">
          {/* Generate Link Section */}
          <div className="bg-card border border-border p-8">
            <h3 className="text-sm font-black uppercase tracking-tight text-foreground mb-6 flex items-center gap-2">
              <Link2 size={16} className="text-primary" /> Generate Onboarding Link
            </h3>
            <div className="flex gap-4 mb-6">
              <button onClick={() => generateLink('generic')} disabled={generating}
                className="px-8 py-3 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate Generic Link'}
              </button>
            </div>
            {generatedLink && (
              <div className="flex items-center gap-3 bg-muted/30 border border-border p-4">
                <input readOnly value={generatedLink} className="flex-1 bg-transparent text-xs font-bold outline-none truncate" />
                <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase">
                  {copied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-0 border-b border-border">
            <button onClick={() => setOnbTab('links')}
              className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest relative ${onbTab === 'links' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              Generated Links
              {onbTab === 'links' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
            <button onClick={() => setOnbTab('submissions')}
              className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest relative ${onbTab === 'submissions' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              Submissions
              {onbTab === 'submissions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          </div>

          {/* Links Table */}
          {onbTab === 'links' && (
            <div className="bg-card border border-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">For</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created By</th>
                    <th className="px-6 py-4">Expires</th>
                    <th className="px-6 py-4">Submissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {links.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-muted-foreground text-sm">No links generated yet</td></tr>
                  ) : links.map(l => (
                    <tr key={l.id} className="hover:bg-muted/10">
                      <td className="px-6 py-4"><span className={`text-[9px] px-3 py-1 font-black uppercase tracking-widest ${l.link_type === 'generic' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>{l.link_type}</span></td>
                      <td className="px-6 py-4 text-xs font-bold">{l.first_name ? `${l.first_name} ${l.last_name}` : '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] px-3 py-1 font-black uppercase ${l.status === 'active' ? 'bg-green-500/10 text-green-400' : l.status === 'submitted' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{l.status}</span>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground">{l.created_by_name || '—'}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground">{new Date(l.expires_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-xs font-black text-foreground">{l.submission_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Submissions Table */}
          {onbTab === 'submissions' && (
            <div className="bg-card border border-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Link Type</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center text-muted-foreground text-sm">No submissions yet</td></tr>
                  ) : submissions.map(s => {
                    const isExpanded = expandedSubmissions.has(s.id);
                    const docCount = s.documents?.length || 0;
                    return (
                      <>
                        <tr key={s.id} className={`hover:bg-muted/10 transition-colors ${isExpanded ? 'bg-muted/5' : ''}`}>
                          <td className="px-6 py-4 text-xs font-black uppercase">{s.first_name} {s.last_name}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground">{s.email}</td>
                          <td className="px-6 py-4 text-[10px] font-bold">{s.phone_number || '—'}</td>
                          <td className="px-6 py-4"><span className="text-[9px] px-2 py-1 bg-muted font-black uppercase">{s.link_type}</span></td>
                          <td className="px-6 py-4">
                            {docCount > 0 ? (
                              <button
                                onClick={() => toggleSubmissionExpand(s.id)}
                                className="flex items-center gap-1.5 text-xs font-black text-primary hover:text-primary/80 transition-colors group"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {docCount} file{docCount !== 1 ? 's' : ''}
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">0 files</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[9px] px-3 py-1 font-black uppercase ${s.status === 'approved' ? 'bg-green-500/10 text-green-400' : s.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{s.status}</span>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            {s.status === 'pending' && (
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => updateSubmissionStatus(s.id, 'approved')} className="p-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20"><CheckCircle2 size={14} /></button>
                                <button onClick={() => updateSubmissionStatus(s.id, 'rejected')} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20"><XCircle size={14} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {isExpanded && s.documents && s.documents.length > 0 && (
                          <tr key={`${s.id}-docs`}>
                            <td colSpan={8} className="px-0 py-0">
                              <div className="bg-muted/20 border-t border-b border-border/50 px-10 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">Uploaded Documents</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {s.documents.map((doc: OnboardingDocument) => (
                                    <div key={doc.id} className="flex items-center justify-between bg-card border border-border px-4 py-3 group hover:border-primary/30 transition-colors">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 bg-primary/10 flex items-center justify-center flex-shrink-0">
                                          <FileText size={14} className="text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-black text-foreground uppercase tracking-tight truncate">{doc.file_name}</p>
                                          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type} Â· {formatSize(doc.file_size)}</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0 ml-3">
                                        <a
                                          href={`/api/onboarding/documents/${doc.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                          title="View"
                                        >
                                          <Eye size={14} />
                                        </a>
                                        <a
                                          href={`/api/onboarding/documents/${doc.id}?download=1`}
                                          download
                                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                          title="Download"
                                        >
                                          <Download size={14} />
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
