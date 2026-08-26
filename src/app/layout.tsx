import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'ALBA Finance',
  description: 'Sistem Manajemen Keuangan Multi-Unit',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
<head>
        <meta name="theme-color" content="#0284c7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.svg" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.svg" />
        <link rel="mask-icon" href="/favicon.svg" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
