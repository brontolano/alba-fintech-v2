"use client";

import { RetailSidebar } from "@/components/retail/RetailSidebar";
import { RetailMobileNav } from "@/components/retail/RetailMobileNav";
import { Header } from "@/components/layout/Header";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function RetailLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const user = session?.user ? {
    role: session.user.role as "MANAGER" | "STAFF",
    unitId: (session.user as any).unitId,
    unitName: (session.user as any).unitName,
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <Header user={session?.user as any} onMenuClick={() => setSidebarOpen(true)} />
      <RetailSidebar 
        user={user} 
        expanded={true} 
        onToggle={() => setSidebarOpen(o => !o)} 
        mobileOpen={mobileNavOpen} 
        onCloseMobile={() => setMobileNavOpen(false)} 
      />
      <RetailMobileNav user={user ? { role: user.role } : null} />
      <main className={`md:ml-64 min-h-screen transition-all ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>
      {mobileNavOpen && <RetailMobileNav user={user ? { role: user.role } : null} />}
    </div>
  );
}