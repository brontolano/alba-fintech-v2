import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';

export const metadata = {
  title: 'Dashboard - ALBA Finance v3',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-200 flex justify-center">
      <div className="w-full max-w-full bg-slate-50 min-h-screen relative flex flex-col shadow-2xl border-x border-slate-200 overflow-hidden">
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto pb-[80px] pt-[56px]">
          <div className="w-full px-4 py-4">
            {children}
          </div>
        </main>
        <MobileNav user={session.user} />
      </div>
    </div>
  );
}
