'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-red-100 p-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
     </div>
      <h2 className="text-xl font-bold">Terjadi Kesalahan</h2>
      <p className="max-w-md text-slate-600">
        Kami tidak dapat memuat halaman ini. Mohon coba lagi atau hubungi administrator.
     </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
      >
        Coba Lagi
     </button>
   </div>
  );
}
