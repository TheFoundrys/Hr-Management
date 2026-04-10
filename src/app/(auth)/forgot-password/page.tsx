'use client';

import { useState } from 'react';
import { GraduationCap, Loader2, ArrowLeft, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to send reset link');
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
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6">
          <MailCheck className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight mb-3">Check Your Mail</h1>
        <p className="text-muted-foreground text-sm mb-10 leading-relaxed">We've sent a secure reset link to your terminal address. Please verify to regain access.</p>
        <a href="/login" className="inline-block w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
          Return to Login
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
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Recover Key</h1>
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 leading-none">Credential Reset Protocol</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Terminal Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground placeholder-muted-foreground/50 focus:border-primary outline-none transition-all"
            placeholder="you@university.edu"
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
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <a href="/login" className="text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:text-primary transition-colors">
          <ArrowLeft size={12} /> Back to Login
        </a>
      </div>
    </div>
  );
}
