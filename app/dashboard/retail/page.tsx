"use client";

import { useSession } from "next-auth/react";
import { RetailManagerDashboard } from "@/components/retail/RetailManagerDashboard";
import { RetailStaffDashboard } from "@/components/retail/RetailStaffDashboard";

export default function RetailDashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          Memuat data dashboard...
        </div>
      </div>
    );
  }

  const role = session?.user?.role;
  const isRetail = (session?.user as any)?.unitIsRetail === true;

  if (!isRetail) return <div className="p-8 text-center text-muted-foreground">Bukan unit retail</div>;

  if (role === "MANAGER") return <RetailManagerDashboard />;
  if (role === "STAFF") return <RetailStaffDashboard />;

  return <div className="p-8 text-center text-muted-foreground">Role tidak dikenali</div>;
}