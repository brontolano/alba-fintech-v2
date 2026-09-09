'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw, AlertCircle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          Terjadi Kesalahan
        </h1>
        <p className="mb-8 text-slate-500">
          Maaf, terjadi kesalahan saat memproses permintaan Anda. 
          Silakan coba lagi atau kembali ke beranda.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Home className="h-4 w-4" />
            Beranda
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && error?.digest && (
          <p className="mt-4 text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
