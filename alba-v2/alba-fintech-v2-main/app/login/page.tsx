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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50">
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden border-2 border-white shadow-md">
            <Image
              src="/logo-baru.png"
              alt="Logo Al-Basyariyah"
              width={96}
              height={96}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">ALBA Finance v3</h1>
          <p className="text-slate-600 mt-2">
            Aplikasi Keuangan Pondok Pesantren Al-Basyariyah
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Jl. Mahmud, Rahayu, Kec. Margaasih, Kab. Bandung, Jawa Barat 40218
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 text-center">
            Masuk ke Sistem
          </h2>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2024 Pondok Pesantren Al-Basyariyah. All rights reserved.
        </p>
      </div>
    </div>
  );
}
