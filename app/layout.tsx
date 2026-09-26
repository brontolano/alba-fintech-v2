import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import SessionProvider from "@/components/providers/session-provider";
import PerformanceGuard from "@/components/ui/PerformanceGuard";
import AppViewportGuard from "@/components/ui/AppViewportGuard";
import PwaRegister from "@/components/PwaRegister";

// Font via CSS local (see globals.css) to avoid build-time network fetch
const fontSans = { variable: "--font-sans" };

export const metadata: Metadata = {
  title: {
    default:
      "ALBA Finance v7 - Aplikasi Keuangan Pondok Pesantren Al-Basyariyah",
    template: `%s | ALBA Finance v7`,
  },
  description: "Aplikasi Keuangan Pondok Pesantren Al-Basyariyah",
  keywords: [
    "keuangan",
    "pondok",
    "pesantren",
    "al-basyariyah",
    "keuangan pesantren",
  ],
  authors: [{ name: "Pondok Pesantren Al-Basyariyah" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://alba.brontolano.com"),
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// Next.js 16: themeColor wajib di viewport export, bukan metadata
export const viewport = {
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <link rel="icon" href="/icons/icon-32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body
        className={`${fontSans.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <PwaRegister />
        <AppViewportGuard />
        <SessionProvider>{children}</SessionProvider>
        <Toaster position="top-right" closeButton richColors />
        <PerformanceGuard />
      </body>
    </html>
  );
}
