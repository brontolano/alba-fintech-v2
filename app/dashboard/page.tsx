"use client";

import { useSession } from "next-auth/react";
import SuperadminDashboard from "@/components/dashboard/SuperadminDashboard";
import PimpinanDashboard from "@/components/dashboard/PimpinanDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import { KpakStaffDashboard } from "@/components/kpak/KpakStaffDashboard";
import { KpakManagerDashboard } from "@/components/kpak/KpakManagerDashboard";
import { RetailStaffDashboard } from "@/components/retail/RetailStaffDashboard";
import { RetailManagerDashboard } from "@/components/retail/RetailManagerDashboard";

export default function DashboardPage() {
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

  const role = session?.user?.role || "STAFF";
  const isKpak = (session?.user as any)?.unitType === "KPAK";
  const isKpakStaff = role === "STAFF" && isKpak;
  const isKpakManager = role === "MANAGER" && isKpak;

  const isRetail = (session?.user as any)?.unitIsRetail === true;
  const isRetailStaff = role === "STAFF" && isRetail;
  const isRetailManager = role === "MANAGER" && isRetail;

  const renderDashboard = () => {
    if (isRetailStaff) return <RetailStaffDashboard />;
    if (isRetailManager) return <RetailManagerDashboard />;
    if (isKpakStaff) return <KpakStaffDashboard />;
    if (isKpakManager) return <KpakManagerDashboard />;
    switch (role) {
      case "SUPERADMIN":
        return <SuperadminDashboard />;
      case "PIMPINAN":
        return <PimpinanDashboard />;
      case "MANAGER":
        return <ManagerDashboard />;
      case "STAFF":
        return <StaffDashboard />;
      default:
        return <StaffDashboard />;
    }
  };

  return <>{renderDashboard()}</>;
}
