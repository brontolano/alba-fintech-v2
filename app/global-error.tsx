'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <div className="mb-6 flex justify-center">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Terjadi Kesalahan Sistem
          </h1>
          <p className="mb-8 text-sm text-slate-500">
            Aplikasi mengalami kesalahan yang tidak terduga. Silakan coba muat ulang halaman.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </button>
          </div>
          {error?.digest && (
            <p className="mt-6 text-xs text-slate-400">
              Kode Error: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
