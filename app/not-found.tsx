import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-slate-900">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-slate-700">
          Halaman Tidak Ditemukan
        </h2>
        <p className="mb-8 max-w-md text-slate-500">
          Maaf, halaman yang Anda cari tidak dapat ditemukan. 
          Pastikan URL sudah benar atau kembali ke beranda.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Home className="h-4 w-4" />
            Beranda
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </div>
      </div>
    </div>
  );
}
