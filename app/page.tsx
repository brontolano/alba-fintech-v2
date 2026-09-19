import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import HomeClient from '@/components/auth/HomeClient';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return <HomeClient hasSession={!!session} />;
}
