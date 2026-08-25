'use client';

import { SessionProvider } from 'next-auth/react';
import { PWAProvider } from './PWAProvider';

// PWAProvider doesn't need to render children, it's a void component
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PWAProvider>
        {children}
      </PWAProvider>
    </SessionProvider>
  );
}
