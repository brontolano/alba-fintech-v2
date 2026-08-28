import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AccountPage from '@/components/shared/AccountPage';

export default async function AccountRoute() {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    redirect('/login');
  }

  return <AccountPage />;
}
