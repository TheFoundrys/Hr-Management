'use client';

import { useState } from 'react';
import { Fingerprint, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function BiometricPage() {
  const [rawData, setRawData] = useState('USERID=12\tCHECKTIME=2026-03-31 09:12:00\tSTATUS=0');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendPush = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/biometric/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'x-biometric-key': 'biometric-device-secret-key',
          'x-tenant-id': 'default',
        },
        body: rawData,
      });
      const data = await res.json();
      setResult({ success: res.ok, message: data.message || data.error || 'Unknown response' });
    } catch (err) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  const presets = [
    { label: 'Single Check-in', data: `USERID=1\tCHECKTIME=${new Date().toISOString().replace('T', ' ').substring(0, 19)}\tSTATUS=0` },
    { label: 'Multiple Punches', data: `USERID=1\tCHECKTIME=2026-03-31 09:00:00\tSTATUS=0\nUSERID=1\tCHECKTIME=2026-03-31 18:00:00\tSTATUS=0\nUSERID=2\tCHECKTIME=2026-03-31 09:15:00\tSTATUS=0` },
    { label: 'Late Entry', data: `USERID=3\tCHECKTIME=2026-03-31 10:30:00\tSTATUS=0` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Fingerprint className="w-7 h-7 text-primary-400" /> Biometric Integration
        </h1>
        <p className="text-white/40 text-sm mt-1">Test ZKTeco ADMS push endpoint</p>
      </div>

      {/* Info Card */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white/70 mb-3">Endpoint Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/40">URL:</span>
            <code className="ml-2 px-2 py-1 bg-white/5 rounded-lg text-primary-400 text-xs">/api/biometric/push</code>
          </div>
          <div>
            <span className="text-white/40">Method:</span>
            <code className="ml-2 px-2 py-1 bg-white/5 rounded-lg text-accent-400 text-xs">POST</code>
          </div>
          <div>
            <span className="text-white/40">Content-Type:</span>
            <code className="ml-2 px-2 py-1 bg-white/5 rounded-lg text-warning-500 text-xs">text/plain</code>
          </div>
          <div>
            <span className="text-white/40">Security:</span>
            <code className="ml-2 px-2 py-1 bg-white/5 rounded-lg text-danger-500 text-xs">x-biometric-key header</code>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="flex gap-2 flex-wrap">
        {presets.map((p) => (
          <button key={p.label} onClick={() => setRawData(p.data)} className="glass px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all">{p.label}</button>
        ))}
      </div>

      {/* Input */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white/70 mb-3">Raw Biometric Data</h2>
        <textarea
          value={rawData}
          onChange={(e) => setRawData(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm placeholder-white/20 focus:border-primary-500 transition-colors resize-none"
          placeholder="USERID=12&#9;CHECKTIME=2026-03-31 09:12:00&#9;STATUS=0"
        />
        <div className="mt-4 flex items-center gap-4">
          <button onClick={sendPush} disabled={sending} className="gradient-primary px-6 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Push'}
          </button>
          {result && (
            <div className={`flex items-center gap-2 text-sm ${result.success ? 'text-accent-400' : 'text-danger-500'}`}>
              {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {result.message}
            </div>
          )}
        </div>
      </div>

      {/* Format Info */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white/70 mb-3">Data Format</h2>
        <div className="bg-white/5 rounded-xl p-4 font-mono text-xs text-white/60 space-y-1">
          <p>USERID=&lt;device_user_id&gt;\tCHECKTIME=&lt;YYYY-MM-DD HH:MM:SS&gt;\tSTATUS=&lt;0|1&gt;</p>
          <p className="text-white/30 mt-2"># Multiple entries separated by newlines</p>
          <p className="text-white/30"># STATUS: 0 = check-in, 1 = check-out</p>
          <p className="text-white/30"># USERID must map to an employee&#39;s deviceUserId</p>
        </div>
      </div>
    </div>
  );
}
