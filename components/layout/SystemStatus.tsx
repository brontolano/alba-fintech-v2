'use client';

import { useEffect, useState } from 'react';

/**
 * Status Sistem di Header — sesuai prototipe Superadmin:
 * "Server Normal, Sinkronisasi Aktif" / peringatan saat DB tak terjangkau.
 * Sembunyikan di layar kecil (ruang header terbatas), indikator DB terputus
 * tetap ada via DbStatusIndicator di kanan.
 */
export function SystemStatus() {
  const [dbUp, setDbUp] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!cancelled) setDbUp(res.ok);
      } catch {
        if (!cancelled) setDbUp(false);
      }
    };

    check();
  }, []);

  // Jangan tampilkan apa pun sampai health check pertama selesai (hindari flicker).
  if (dbUp === null) return null;

  return (
    <div
      className="hidden lg:flex items-center gap-1.5 text-xs"
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          dbUp ? 'bg-primary' : 'bg-destructive animate-pulse'
        }`}
        aria-hidden="true"
      />
      <span className={dbUp ? 'text-muted-foreground' : 'text-destructive font-medium'}>
        {dbUp ? 'Server Normal · Sinkronisasi Aktif' : 'Menunggu Database…'}
      </span>
    </div>
  );
}
