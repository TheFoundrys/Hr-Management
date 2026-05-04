'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Home } from 'lucide-react';
import Link from 'next/link';

function ScanResult() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing security token');
      return;
    }

    const processScan = async () => {
      try {
        const response = await fetch('/api/attendance/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType: 'qr', token })
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.type === 'check_in' ? 'Check-in Confirmed' : 'Check-out Confirmed');
        } else {
          setStatus('error');
          setMessage(result.error || 'Verification Failed');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error. Connection failed.');
      }
    };

    processScan();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div className="max-w-sm w-full glass-card p-10 rounded-[2.5rem] shadow-2xl space-y-6 animate-zoom-in">
        {status === 'loading' && (
          <>
            <Loader2 className="w-20 h-20 text-primary-400 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-white">Verifying...</h1>
            <p className="text-white/40">Please wait while we secure your location.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-success-500/30">
               <CheckCircle2 className="w-10 h-10 text-success-400 animate-bounce" />
            </div>
            <h1 className="text-2xl font-bold text-white">{message}</h1>
            <p className="text-white/40">Your attendance has been recorded in real-time.</p>
            <Link href="/dashboard" className="block w-full py-3 mt-8 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium border border-white/10 transition-all flex items-center justify-center gap-2">
               <Home className="w-4 h-4" /> Back to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-danger-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-danger-500/30">
               <XCircle className="w-10 h-10 text-danger-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-white">Access Denied</h1>
            <p className="text-danger-400 font-medium text-sm">{message}</p>
            <p className="text-white/30 text-xs mt-4">Make sure you are on the authorized network and your QR hasn't expired.</p>
            <Link href="/profile/qr" className="block w-full py-3 mt-8 gradient-primary rounded-xl text-white font-semibold shadow-lg transition-all">
               Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white">Loading...</div>}>
      <ScanResult />
    </Suspense>
  );
}
