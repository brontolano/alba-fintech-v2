'use client';

import { useEffect, useState } from 'react';
import { Database, WifiOff } from 'lucide-react';

/**
 * Indikator status koneksi database di Header.
 * Polling ringan (60 detik) ke /api/health yang memiliki timeout internal 4 detik,
 * sehingga saat DB hosting tak terjangkau UI menunjukkan status jelas — bukan error 500.
 * Tidak dirender saat DB normal (menghemat ruang header).
 */
export function DbStatusIndicator() {
  const [state, setState] = useState<'checking' | 'down'>('checking');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!cancelled) setState(res.ok ? 'checking' : 'down');
      } catch {
        if (!cancelled) setState('down');
      }
    };

    check();
  }, []);

  if (state !== 'down') return null;

  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/30 px-2.5 py-1.5 text-destructive"
      role="status"
      aria-live="polite"
      title="Tidak dapat terhubung ke server database. Data tidak dapat dimuat sementara."
    >
      <Database className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="text-xs font-medium whitespace-nowrap">DB terputus</span>
      <WifiOff className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
    </div>
  );
}
