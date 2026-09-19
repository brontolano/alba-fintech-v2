"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

interface DashboardClientProps {
  user: any;
  children: React.ReactNode;
}

export function DashboardClient({ user, children }: DashboardClientProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
