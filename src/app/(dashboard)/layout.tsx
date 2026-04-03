'use client';

import { Sidebar } from '@/components/Sidebar';
import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  // Authentication is handled by middleware.ts
  // This client-side check is a fallback for store hydration

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
