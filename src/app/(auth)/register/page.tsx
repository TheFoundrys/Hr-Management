'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FACULTY',
    tenantId: 'default',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess(data.message || 'Registration successful. Awaiting admin approval.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-card border border-border rounded-3xl p-10 animate-slide-up text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-3xl mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight mb-3">Identity Registered</h1>
        <p className="text-muted-foreground text-sm mb-10 leading-relaxed">{success}</p>
        <a href="/login" className="inline-block w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
          Return to Portal
        </a>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-10 animate-slide-up shadow-xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Create Identity</h1>
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 leading-none">Join the Academic Network</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
          <input
            id="register-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground placeholder-muted-foreground/50 focus:border-primary outline-none transition-all"
            placeholder="Dr. John Doe"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Terminal Address (Email)</label>
          <input
            id="register-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground placeholder-muted-foreground/50 focus:border-primary outline-none transition-all"
            placeholder="you@university.edu"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Security Key</label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground placeholder-muted-foreground/50 focus:border-primary outline-none transition-all pr-14"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assigned Role</label>
          <select
            id="register-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground focus:border-primary outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="FACULTY">Teaching Faculty</option>
            <option value="STAFF">Non-Teaching Staff</option>
            <option value="ADMIN">Administrator</option>
            <option value="HR">HR Manager</option>
          </select>
        </div>

        {error && (
          <div className="px-5 py-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        <button
          id="register-button"
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Processing...' : 'Request Access'}
        </button>
      </form>

      <div className="mt-10 text-center">
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
          Existing Identity?{' '}
          <a href="/login" className="text-primary hover:underline decoration-2 underline-offset-4 transition-all">
            Enter Portal
          </a>
        </p>
      </div>
    </div>
  );
}
