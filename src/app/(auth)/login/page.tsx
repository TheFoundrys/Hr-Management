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
    <div className="bg-card border border-border rounded-none p-8 shadow-none">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-none mb-4">
          <GraduationCap className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">HR Management System</h1>
        <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">Username or Email</label>
          <input
            id="login-email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-none text-sm text-foreground focus:ring-1 ring-primary outline-none transition-all"
            placeholder="admin or email@example.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-none text-sm text-foreground focus:ring-1 ring-primary outline-none transition-all pr-12"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-none text-red-600 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <a href="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
            Forgot Password?
          </a>
          <a href="/register" className="text-xs font-bold text-primary hover:underline">
            Register
          </a>
        </div>

        <button
          id="login-button"
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-none font-bold text-sm hover:bg-primary/90 transition-all shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-muted-foreground text-xs font-medium">
          The Foundry HR Solutions
        </p>
      </div>
    </div>
  );
}
