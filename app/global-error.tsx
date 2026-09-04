"use client";

import Link from 'next/link';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-900 antialiased">
        <main className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mb-6 text-5xl" aria-hidden="true">
            !
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Terjadi Kesalahan Sistem
          </h1>
          <p className="mb-8 text-sm text-slate-500">
            Aplikasi mengalami kesalahan yang tidak terduga. Silakan coba muat
            ulang halaman.
          </p>
          <div className="flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Kembali ke Login
            </Link>
          </div>
          {error?.digest && (
            <p className="mt-6 text-xs text-slate-400">
              Kode Error: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
