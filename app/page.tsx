import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import HomeClient from '@/components/auth/HomeClient';

export default async function HomePage() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // Invalid JWT / DB error — treat as no session
  }

  return <HomeClient hasSession={!!session} />;
}
