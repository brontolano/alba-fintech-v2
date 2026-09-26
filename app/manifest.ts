import type { MetadataRoute } from "next";

const ICONS = [
  {
    src: "/icons/icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icons/icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icons/icon-maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
] satisfies MetadataRoute.Manifest["icons"];

const SHORTCUT_ICON = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
] satisfies MetadataRoute.Manifest["icons"];

const SHORTCUTS = [
  { name: "Dashboard", url: "/dashboard", icons: SHORTCUT_ICON },
  { name: "POS Kasir", url: "/dashboard/pos", icons: SHORTCUT_ICON },
  { name: "Laporan Keuangan", url: "/dashboard/reports", icons: SHORTCUT_ICON },
  { name: "Pengumuman", url: "/dashboard/announcements", icons: SHORTCUT_ICON },
] satisfies MetadataRoute.Manifest["shortcuts"];

const SCREENSHOTS = [
  {
    src: "/tutorial/img/02-superadmin-dashboard.png",
    sizes: "780x1688",
    type: "image/png",
    form_factor: "narrow",
    label: "Dashboard Admin",
  },
  {
    src: "/tutorial/img/06-pimpinan-dashboard.png",
    sizes: "780x1688",
    type: "image/png",
    form_factor: "narrow",
    label: "Dashboard Pimpinan",
  },
  {
    src: "/tutorial/img/12-manager-retail-dashboard.png",
    sizes: "780x1688",
    type: "image/png",
    form_factor: "narrow",
    label: "Kasir & POS Unit",
  },
] satisfies MetadataRoute.Manifest["screenshots"];

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ALBA Finance v7 - Keuangan Pondok Pesantren Al-Basyariyah",
    short_name: "ALBA Finance",
    description: "Aplikasi Keuangan Pondok Pesantren Al-Basyariyah",
    id: "/",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#059669",
    orientation: "portrait-primary",
    categories: ["finance", "business", "productivity"],
    prefer_related_applications: false,
    launch_handler: { client_mode: "navigate-existing" },
    icons: ICONS,
    shortcuts: SHORTCUTS,
    screenshots: SCREENSHOTS,
  };
}