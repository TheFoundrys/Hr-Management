'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teaching' as 'admin' | 'teaching' | 'non-teaching',
    tenantId: 'default',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8 animate-slide-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl mb-4 shadow-lg shadow-primary-500/30">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-surface-200/60 text-sm mt-1">Join UniStaff Management System</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-200/80 mb-2">Full Name</label>
          <input
            id="register-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary-500 transition-colors"
            placeholder="Dr. John Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-200/80 mb-2">Email Address</label>
          <input
            id="register-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary-500 transition-colors"
            placeholder="you@university.edu"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-200/80 mb-2">Password</label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary-500 transition-colors pr-12"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-200/80 mb-2">Role</label>
          <select
            id="register-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-primary-500 transition-colors"
          >
            <option value="teaching" className="bg-surface-900">Teaching Staff</option>
            <option value="non-teaching" className="bg-surface-900">Non-Teaching Staff</option>
            <option value="admin" className="bg-surface-900">Admin</option>
          </select>
        </div>

        {error && (
          <div className="px-4 py-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-500 text-sm">
            {error}
          </div>
        )}

        <button
          id="register-button"
          type="submit"
          disabled={loading}
          className="w-full py-3 gradient-primary rounded-xl text-white font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-surface-200/50 text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
