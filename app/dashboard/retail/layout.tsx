import type { ReactNode } from "react";

/**
 * Layout retail — pass-through bersih.
 *
 * Chrome aplikasi (Header + Sidebar + MobileNav) sudah disediakan oleh
 * `app/dashboard/DashboardClient.tsx`. Layout ini SENGAJA tidak me-render
 * header/sidebar/nav sendiri agar tidak terjadi:
 * - header ganda,
 * - sidebar ganda,
 * - tombol POS melayang (FAB) yang menutupi konten.
 *
 * Navigasi staff retail memakai MobileNav generik + grup "Toko" di Sidebar.
 */
export default function RetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
