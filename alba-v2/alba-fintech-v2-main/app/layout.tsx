import './globals.css';
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { Toaster } from 'sonner';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'ALBA Finance v3 - Aplikasi Keuangan Pondok Pesantren Al-Basyariyah',
    template: `%s | ALBA Finance v3`,
  },
  description: 'Aplikasi Keuangan Pondok Pesantren Al-Basyariyah',
  keywords: ['keuangan', 'pondok', 'pesantren', 'al-basyariyah', 'keuangan pesantren'],
  authors: [{ name: 'Pondok Pesantren Al-Basyariyah' }],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} font-sans antialiased min-h-screen bg-slate-50 text-slate-900`}
      >
        {children}
        <Toaster position="top-right" closeButton richColors />
      </body>
    </html>
  );
}

// Force dynamic rendering for layout and pages
export const dynamic = 'force-dynamic';
