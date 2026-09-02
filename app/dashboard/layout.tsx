import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
    <div className="min-h-screen bg-slate-50">
      <Header user={session.user} />
      <div className="flex">
        <Sidebar user={session.user} />
        <main className="flex-1 overflow-y-auto pb-6">
          {children}
        </main>
      </div>
      <MobileNav user={session.user} />
    </div>
  );
}
