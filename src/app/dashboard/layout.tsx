import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import NotificationBell from '@/components/NotificationBell';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    redirect('/login');
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN';

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar – always visible for SuperAdmin, hidden on mobile for other roles */}
      <Sidebar
        role={session.user.role}
        name={session.user.name}
        forceMobile={isSuperAdmin}
      />

      <main
        className={`flex-1 overflow-x-hidden transition-all ${
          isSuperAdmin ? 'lg:ml-0' : 'lg:ml-64'
        } pb-16 lg:pb-0`}
      >
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Selamat datang kembali</p>
              <h1 className="text-lg font-semibold text-slate-800">
                {session.user.name ?? session.user.email}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Suspense fallback={null}>
                <NotificationBell />
              </Suspense>
              <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">
                {session.user.role}
              </span>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>

      {/* Mobile bottom nav – hidden for SuperAdmin (desktop only) */}
      {!isSuperAdmin && <MobileBottomNav role={session.user.role} />}
    </div>
  );
}