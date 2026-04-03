'use client';

import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Trash2, Loader2, FolderOpen } from 'lucide-react';

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

const CATEGORIES = ['ID_PROOF', 'CERTIFICATE', 'PAYSLIP', 'CONTRACT', 'RESUME', 'OTHER'];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('');
  const [uploadForm, setUploadForm] = useState({ userId: '', category: 'OTHER' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocs(); }, [category]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary-400" /> Documents
        </h1>
        <p className="text-white/40 text-sm mt-1">{docs.length} documents stored</p>
      </div>

      {/* Upload Section */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Document</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Employee ID</label>
            <input type="text" value={uploadForm.userId} onChange={(e) => setUploadForm({ ...uploadForm, userId: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary-500 transition-colors" placeholder="EMP001" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Category</label>
            <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-surface-900">{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">File</label>
            <input ref={fileRef} type="file" className="w-full text-sm text-white/50 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30" />
          </div>
          <button onClick={handleUpload} disabled={uploading} className="gradient-primary px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCategory('')} className={`px-4 py-2 rounded-xl text-sm transition-all ${!category ? 'gradient-primary text-white shadow-lg' : 'glass text-white/50 hover:text-white'}`}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 rounded-xl text-sm transition-all ${category === c ? 'gradient-primary text-white shadow-lg' : 'glass text-white/50 hover:text-white'}`}>{c.replace('_', ' ')}</button>
        ))}
      </div>

      {/* List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/30">
            <FolderOpen className="w-12 h-12 mb-3" />
            <p>No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['File Name', 'Employee', 'Category', 'Size', 'Type', 'Uploaded By', 'Date', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-white/80">{d.file_name}</td>
                    <td className="py-3 px-4 text-sm text-primary-400 font-mono">{d.user_id}</td>
                    <td className="py-3 px-4"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/15 text-primary-400">{d.category}</span></td>
                    <td className="py-3 px-4 text-sm text-white/50">{formatSize(d.file_size)}</td>
                    <td className="py-3 px-4 text-sm text-white/40">{d.file_type}</td>
                    <td className="py-3 px-4 text-sm text-white/50">{d.uploaded_by}</td>
                    <td className="py-3 px-4 text-sm text-white/40">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4"><button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg text-danger-500/50 hover:text-danger-500 hover:bg-danger-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
