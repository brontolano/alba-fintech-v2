import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import SessionProvider from "@/components/providers/session-provider";
import PerformanceGuard from "@/components/ui/PerformanceGuard";
import AppViewportGuard from "@/components/ui/AppViewportGuard";

// Font via CSS local (see globals.css) to avoid build-time network fetch
const fontSans = { variable: "--font-sans" };

export const metadata: Metadata = {
  title: {
    default:
      "ALBA Finance v3 - Aplikasi Keuangan Pondok Pesantren Al-Basyariyah",
    template: `%s | ALBA Finance v3`,
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
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/logo-baru.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/logo-baru.png",
    apple: "/logo-baru.png",
  },
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
        <link rel="icon" href="/logo-baru.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-baru.png" />
      </head>
      <body
        className={`${fontSans.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <AppViewportGuard />
        <SessionProvider>{children}</SessionProvider>
        <Toaster position="top-right" closeButton richColors />
        <PerformanceGuard />
      </body>
    </html>
  );
}

// Force dynamic rendering for layout and pages
export const dynamic = "force-dynamic";
