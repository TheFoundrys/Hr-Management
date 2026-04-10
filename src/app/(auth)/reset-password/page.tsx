'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GraduationCap, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(data.error || 'Failed to update password');
      }
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
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight mb-3">Key Updated</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">Your security session has been updated successfully. Redirecting you to login...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-card border border-border rounded-3xl p-10 text-center">
        <p className="text-danger font-bold">Invalid or missing security token.</p>
        <a href="/login" className="text-primary hover:underline mt-4 inline-block text-xs uppercase font-black">Back to Portal</a>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-10 animate-slide-up shadow-xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Overwrite Key</h1>
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 leading-none">Security Credential Update</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Security Key</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground placeholder-muted-foreground/50 focus:border-primary outline-none transition-all"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Identity Key</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground placeholder-muted-foreground/50 focus:border-primary outline-none transition-all"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <div className="px-5 py-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        <button
          disabled={loading}
          type="submit"
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-600/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Overwrite'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
