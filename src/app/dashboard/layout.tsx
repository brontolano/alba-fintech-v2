import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={session.user.role} name={session.user.name} />
      <main className="flex-1 overflow-x-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Selamat datang kembali</p>
              <h1 className="text-lg font-semibold text-slate-800">
                {session.user.name ?? session.user.email}
              </h1>
            </div>
            <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">
              {session.user.role}
            </span>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}