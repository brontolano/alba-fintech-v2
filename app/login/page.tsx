import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/options';
import LoginForm from '@/components/auth/LoginForm';
import Image from 'next/image';

export const metadata = {
  title: 'Login - ALBA Finance v3',
  description: 'Masuk ke Aplikasi Keuangan Pondok Pesantren Al-Basyariyah',
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-4 sm:p-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-20 h-20 flex-shrink-0">
            <Image
              src="/logo-baru.png"
              alt="Logo Al-Basyariyah"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl sm:text-5xl font-black text-emerald-700 leading-none tracking-tight">
              KEUANGAN
            </h1>
            <p className="text-lg sm:text-xl text-slate-800 font-bold tracking-[0.3em] mt-1">
              AL-BASYARIAH
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500 text-center">
          Jl. Mahmud, Rahayu, Kec. Margaasih,<br />
          Kab. Bandung, Jawa Barat 40218
        </p>

        <div className="mt-8 bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            MASUK
          </h2>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 Pondok Pesantren Al-Basyariyah. All rights reserved.
        </p>
      </div>
    </div>
  );
}
