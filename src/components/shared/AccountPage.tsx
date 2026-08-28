'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, User, Mail, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AccountPage() {
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ redirect: true, callbackUrl: '/login' });
    } catch (error) {
      console.error('[Logout] Error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
        <p className="text-slate-500">Memuat profil pengguna...</p>
      </div>
    );
  }

  const { name, email, role, image } = session.user;
  const roleLabels: Record<string, string> = {
    SUPERADMIN: 'Super Admin',
    PIMPINAN: 'Pimpinan',
    MANAGER: 'Manager',
    STAFF: 'Staff',
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Akun Saya</h1>
        <p className="text-sm text-slate-500 mt-1">Kelola profil dan pengaturan akun</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Avatar */}
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name || 'User'}
              className="w-20 h-20 rounded-full border-4 border-white shadow object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center border-4 border-white shadow">
              <User size={32} className="text-brand-700" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-slate-900">{name ?? 'Tanpa Nama'}</h2>
            <p className="text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-1">
              <Mail size={16} />
              {email}
            </p>
            <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
              <Shield size={16} className="text-brand-600" />
              <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">
                {roleLabels[role ?? ''] ?? role}
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <hr className="my-6 border-slate-200" />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => alert('Fitur ganti password / profil akan segera hadir.')}
            className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Edit Profil
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2',
              'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isLoggingOut ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <LogOut size={16} />
                <span>Keluar (Logout)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
