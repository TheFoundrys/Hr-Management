'use client';

import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { getMyQrToken } from './actions';
import { Loader2, RefreshCw, Smartphone } from 'lucide-react';

export default function MyQrPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);

  const [origin, setOrigin] = useState('');

  const refreshToken = async () => {
    setLoading(true);
    const result = await getMyQrToken();
    if (result.success) {
      setToken(result.token);
      setCountdown(60);
    }
    setLoading(false);
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    refreshToken();
  }, []);

  useEffect(() => {
    if (countdown > 0 && !loading) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      refreshToken();
    }
  }, [countdown, loading]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div className="glass-card max-w-md w-full p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-center p-4 gradient-primary rounded-2xl w-16 h-16 mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-white">Your Attendance QR</h1>
        <p className="text-white/50 text-sm">Present this QR code to the entrance scanner.</p>

        <div className="flex items-center justify-center p-6 bg-white rounded-3xl shadow-xl shadow-white/5 border-4 border-white/10">
          {loading && !token ? (
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
          ) : (
            token && (
              <div className="relative group p-4 bg-white rounded-xl">
                 <QRCodeCanvas 
                   value={`${origin}/attendance/scan?token=${token}`} 
                   size={250} 
                   level="H" 
                   includeMargin={true} 
                 />
                 {loading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                       <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                 )}
              </div>
            )
          )}
        </div>

        <div className="space-y-4">
           <div className="flex items-center justify-between text-xs font-mono text-white/30 uppercase tracking-widest px-4">
              <span>Dynamic Verification</span>
              <span className={countdown < 10 ? 'text-danger-400 font-bold' : ''}>Expires in {countdown}s</span>
           </div>

           <button 
             onClick={refreshToken}
             disabled={loading}
             className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-all font-medium border border-white/5"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             Refresh Now
           </button>
        </div>
      </div>

      <p className="mt-8 text-white/20 text-xs max-w-xs leading-relaxed">
        This QR code is uniquely encrypted and expires every minute for your security. Do not share screenshots.
      </p>
    </div>
  );
}
