"use client";

import { useSession } from "next-auth/react";
import SuperadminDashboard from "@/components/dashboard/SuperadminDashboard";
import PimpinanDashboard from "@/components/dashboard/PimpinanDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import StaffDashboard from "@/components/dashboard/StaffDashboard";

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

  const renderDashboard = () => {
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
