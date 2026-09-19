'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';

/**
 * Halaman Lupa Kata Sandi — sesuai prototipe Auth:
 * "Lupa Kata Sandi / Verifikasi OTP via WhatsApp Pesantren".
 *
 * Sengaja tidak memanggil DB saat render: alur dikirim ke /api/auth/forgot-password
 * yang merespons netral (mode 'unavailable') selama integrasi WhatsApp Gateway belum aktif.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(data.message ?? 'Permintaan diterima.');
      } else {
        setNotice(data.error ?? 'Terjadi kesalahan. Coba lagi.');
      }
    } catch {
      setNotice('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Kembali ke Login
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-emerald-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Lupa Kata Sandi</h1>
              <p className="text-xs text-slate-500">Verifikasi via WhatsApp Pesantren</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="fp-email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email akun Anda
              </label>
              <input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none text-sm bg-slate-50"
                placeholder="nama@alba.local"
                required
                autoComplete="email"
              />
              <p className="mt-2 text-xs text-slate-400 flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" aria-hidden="true" />
                Kode OTP akan dikirim ke nomor WhatsApp pesantren yang terdaftar pada akun ini.
              </p>
            </div>

            {notice && (
              <div
                role="status"
                className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800"
              >
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  <span>Memproses…</span>
                </>
              ) : (
                'Kirim Kode OTP'
              )}
            </button>
          </form>
        </div>

        <div className="flex justify-center mt-8">
          <Image
            src="/logo-baru.png"
            alt="Logo Al-Basyariyah"
            width={40}
            height={40}
            className="object-contain opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
