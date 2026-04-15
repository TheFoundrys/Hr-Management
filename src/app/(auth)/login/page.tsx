'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      setUser(data.user);
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-10 animate-slide-up shadow-xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">University Staff</h1>
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 leading-none">Authentication Node</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Terminal Identity</label>
          <input
            id="login-email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground placeholder-muted-foreground/50 focus:border-primary outline-none transition-all"
            placeholder="Email or Admin Username"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Security Key</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-muted border border-border rounded-2xl text-foreground placeholder-muted-foreground/50 focus:border-primary outline-none transition-all pr-14"
              placeholder="••••••••"
              required
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

        {error && (
          <div className="px-5 py-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <a href="/forgot-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            Forgot Password?
          </a>
          <a href="/register" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline underline-offset-4 decoration-2">
            Create Identity
          </a>
        </div>

        <button
          id="login-button"
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Validating...' : 'Authorize Session'}
        </button>
      </form>

      <div className="mt-10 text-center">
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
          Secure Institutional HR Management System
        </p>
      </div>
    </div>
  );
}
