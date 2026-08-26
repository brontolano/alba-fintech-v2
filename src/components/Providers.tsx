'use client';

import { SessionProvider } from 'next-auth/react';
// PWAProvider temporarily disabled for development
// import { PWAProvider } from './PWAProvider';
import { ToasterProvider } from '@/components/ToasterProvider';
import NotificationBell from '@/components/NotificationBell';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ToasterProvider />
      <NotificationBell />
    </SessionProvider>
  );
}
