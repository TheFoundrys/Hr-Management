'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle2, XCircle, Camera, ShieldCheck, Loader2 } from 'lucide-react';

export default function AttendanceTerminal() {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        rememberLastUsedCamera: true
      },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    if (status === 'loading') return;
    
    setStatus('loading');
    let finalToken = decodedText;
    
    // If the decoded text is a URL, extract the token from the query params
    if (decodedText.includes('?token=')) {
      try {
        const url = new URL(decodedText);
        finalToken = url.searchParams.get('token') || decodedText;
      } catch (e) {
        console.warn("Decoded text was not a valid URL, using raw value");
      }
    }

    try {
      const response = await fetch('/api/attendance/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'qr',
          token: finalToken
        })
      });
      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(result.type === 'check_in' ? 'Check-in Successful!' : 'Check-out Successful!');
        setLastScan(result.data);
        // Reset to idle after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setMessage(result.error || 'Check-in Failed');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  function onScanFailure(error: any) {
    // Usually we ignore failures during scanning as it happens on every frame without a QR
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] p-4 bg-slate-950/50 rounded-3xl">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary-400 font-mono text-xs uppercase tracking-widest mb-2">
             <ShieldCheck className="w-4 h-4" />
             Secure Attendance Terminal
          </div>
          <h1 className="text-3xl font-bold text-white">Entrance Station</h1>
          <p className="text-white/40">Position your QR code within the frame to check in/out.</p>
        </div>

        {/* Scanner Container */}
        <div className="relative glass-card rounded-[2rem] overflow-hidden border-2 border-white/5 shadow-2xl">
          <div id="reader" className="w-full h-full bg-black/20"></div>
          
          {/* Status Overlays */}
          {status === 'loading' && (
            <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
               <Loader2 className="w-16 h-16 text-primary-400 animate-spin" />
               <p className="mt-4 text-white/70 font-medium">Verifying identity...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 z-50 bg-success-500/90 backdrop-blur-md flex flex-col items-center justify-center animate-in zoom-in duration-300">
               <CheckCircle2 className="w-24 h-24 text-white animate-bounce" />
               <h2 className="mt-6 text-3xl font-bold text-white">{message}</h2>
               {lastScan && (
                 <p className="mt-2 text-white/80 font-mono">ID: {lastScan.employee_id}</p>
               )}
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 z-50 bg-danger-500/90 backdrop-blur-md flex flex-col items-center justify-center animate-in zoom-in duration-300">
               <XCircle className="w-24 h-24 text-white animate-pulse" />
               <h2 className="mt-6 text-2xl font-bold text-white">Access Denied</h2>
               <p className="mt-2 text-white/80">{message}</p>
            </div>
          )}
        </div>

        {/* Footer Instructions */}
        <div className="grid grid-cols-2 gap-4">
           <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <Camera className="w-5 h-5 text-primary-400" />
              </div>
              <div className="text-left">
                <p className="text-xs text-white/40 uppercase">Mode</p>
                <p className="text-sm font-medium text-white">High Precision</p>
              </div>
           </div>
           <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="p-2 bg-success-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-success-400" />
              </div>
              <div className="text-left">
                <p className="text-xs text-white/40 uppercase">Status</p>
                <p className="text-sm font-medium text-white">Station Ready</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
