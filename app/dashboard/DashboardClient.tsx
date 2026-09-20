"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

interface DashboardClientProps {
  user: any;
  children: React.ReactNode;
}

export function DashboardClient({ user, children }: DashboardClientProps) {
  const router = useRouter();
  const { status } = useSession();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      const reason =
        "Sesi Anda berakhir atau browser tidak dapat menyimpan cookie. Silakan masuk kembali.";
      toast.error("Sesi login berakhir", {
        description: reason,
        duration: 4000,
      });
      const timeout = setTimeout(() => {
        router.replace("/login?reason=session");
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 shadow-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium">Memuat sesi aplikasi...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
          <p className="text-sm font-semibold text-amber-600">
            Sesi tidak valid
          </p>
          <h2 className="mt-2 text-xl font-bold">Silakan login kembali</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Browser atau instalasi aplikasi mungkin tidak dapat menyimpan cookie
            dengan aman.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_35%),_rgba(248,250,252,0.96)] text-foreground dark:bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_transparent_35%),_rgb(9_14_22)]">
      <Sidebar
        user={user}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((expanded) => !expanded)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-[88px] md:pb-6">
          <div className="w-full px-3 py-4 sm:px-4 md:px-6 md:py-6">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </div>
        </main>
      </div>

      <MobileNav user={user} className="md:hidden" />
    </div>
  );
}
