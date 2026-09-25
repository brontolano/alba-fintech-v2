"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Monitor,
  Receipt,
  ClipboardList,
  LayoutGrid,
  Landmark,
  Users,
  Package,
  ShoppingCart,
  Wallet,
  BarChart3,
  Clock,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  BookOpen,
  Send,
  CreditCard,
  Tags,
  CalendarCheck,
  PackagePlus,
  ClipboardCheck,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import { useShiftGate } from "@/components/kpak/useShiftGate";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    unitId?: string | null;
    unitIsRetail?: boolean;
    unitType?: string;
    lembagaId?: string | null;
  } | null;
  expanded: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  nonRetailOnly?: boolean;
  retailOnly?: boolean;
  /** Hanya tampil untuk STAFF unit retail */
  staffRetailOnly?: boolean;
  /** Sembunyikan untuk STAFF unit retail (dialihkan ke halaman retail) */
  hideForStaffRetail?: boolean;
  kpakOnly?: boolean;
  hideForKpak?: boolean;
  /** Kunci badge pantau live (menu Manager KPAK: review/crew; Manager Retail: batch/count) */
  badgeKey?: "review" | "crew" | "batch" | "count";
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
      },
      {
        label: "Papan Pantau",
        href: "/dashboard/monitor",
        icon: <Monitor size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN"],
      },
      {
        label: "Pengumuman",
        href: "/dashboard/announcements",
        icon: <Bell size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN"],
      },
    ],
  },
  {
    title: "Keuangan",
    items: [
      {
        label: "Buku Kas",
        href: "/dashboard/transactions",
        icon: <Receipt size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
        hideForKpak: true,
      },
      {
        label: "Pengajuan",
        href: "/dashboard/approvals",
        icon: <ClipboardList size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER"],
      },
      {
        label: "Rekonsiliasi",
        href: "/dashboard/reconciliation",
        icon: <Clock size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER"],
      },
      {
        label: "Serah Terima Kas",
        href: "/dashboard/handovers",
        icon: <ClipboardList size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN"],
      },
      {
        label: "Serah Terima Kas",
        href: "/dashboard/handovers",
        icon: <ClipboardList size={20} />,
        roles: ["MANAGER"],
        kpakOnly: true,
      },
      {
        label: "Tabungan Santri",
        href: "/dashboard/savings",
        icon: <Wallet size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
        nonRetailOnly: true,
        hideForKpak: true,
      },
      {
        label: "Kas Unit",
        href: "/dashboard/cash-unit",
        icon: <Receipt size={20} />,
        roles: ["MANAGER", "STAFF"],
        nonRetailOnly: true,
        hideForKpak: true,
      },
      {
        label: "Laporan",
        href: "/dashboard/reports",
        icon: <BarChart3 size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
        hideForKpak: true,
      },
    ],
  },
  {
    title: "Toko",
    items: [
      {
        label: "Inventori",
        href: "/dashboard/inventory",
        icon: <Package size={20} />,
        roles: ["SUPERADMIN", "MANAGER", "STAFF"],
        retailOnly: true,
        hideForStaffRetail: true,
      },
      {
        label: "POS",
        href: "/dashboard/pos",
        icon: <ShoppingCart size={20} />,
        roles: ["MANAGER", "STAFF"],
        retailOnly: true,
      },
    ],
  },
  {
    title: "Retail Saya",
    items: [
      {
        label: "Shift Saya",
        href: "/dashboard/retail/shift",
        icon: <Clock size={20} />,
        roles: ["STAFF"],
        staffRetailOnly: true,
      },
      {
        label: "Stok",
        href: "/dashboard/retail/inventory",
        icon: <Package size={20} />,
        roles: ["STAFF"],
        staffRetailOnly: true,
      },
      {
        label: "Stok Masuk",
        href: "/dashboard/retail/stok-masuk",
        icon: <PackagePlus size={20} />,
        roles: ["STAFF"],
        staffRetailOnly: true,
      },
      {
        label: "Hitung Sisa",
        href: "/dashboard/retail/sisa",
        icon: <ClipboardCheck size={20} />,
        roles: ["STAFF"],
        staffRetailOnly: true,
      },
      {
        label: "Titipan UMKM",
        href: "/dashboard/retail/konsinyasi",
        icon: <Users size={20} />,
        roles: ["STAFF"],
        staffRetailOnly: true,
      },
    ],
  },
  {
    title: "Data KPAK",
    items: [
      {
        label: "Data Santri",
        href: "/dashboard/kpak/students",
        icon: <BookOpen size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
        kpakOnly: true,
      },
      {
        label: "Kategori Layanan",
        href: "/dashboard/settings/categories",
        icon: <Tags size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER"],
        kpakOnly: true,
      },
    ],
  },
  {
    title: "Layanan KPAK",
    items: [
      {
        label: "Shift Saya",
        href: "/dashboard/kpak/shift",
        icon: <CalendarCheck size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
        kpakOnly: true,
      },
      {
        label: "Tabungan Santri",
        href: "/dashboard/savings",
        icon: <Wallet size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
        kpakOnly: true,
      },
      {
        label: "Layanan Keuangan",
        href: "/dashboard/kpak/finance",
        icon: <CreditCard size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
        kpakOnly: true,
      },
      {
        label: "Pengajuan Anggaran",
        href: "/dashboard/kpak/budget",
        icon: <Send size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER"],
        kpakOnly: true,
      },
      {
        label: "Rekap & Laporan",
        href: "/dashboard/kpak/reports",
        icon: <BarChart3 size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
        kpakOnly: true,
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        label: "Unit",
        href: "/dashboard/units",
        icon: <LayoutGrid size={20} />,
        roles: ["SUPERADMIN"],
      },
      {
        label: "Pengguna",
        href: "/dashboard/users",
        icon: <Users size={20} />,
        roles: ["SUPERADMIN"],
      },
      {
        label: "Lembaga",
        href: "/dashboard/lembaga",
        icon: <Landmark size={20} />,
        roles: ["SUPERADMIN"],
      },
      {
        label: "Pengaturan",
        href: "/dashboard/settings",
        icon: <Settings size={20} />,
        roles: ["SUPERADMIN"],
      },
    ],
  },
  {
    items: [
      {
        label: "Profil",
        href: "/dashboard/profile",
        icon: <User size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
      },
      {
        label: "Keluar",
        href: "#",
        icon: <LogOut size={20} />,
        roles: ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
      },
    ],
  },
];

/**
 * Menu khusus MANAGER unit KPAK — disederhanakan fokus pekerjaan manager.
 * Pelayanan (Shift/Tabungan/Layanan Keuangan) milik STAFF dan tidak tampil
 * di sini; route-nya tetap hidup untuk keadaan darurat.
 * Menu generik (Pengajuan/Rekonsiliasi/Serah Terima/Pengajuan Anggaran)
 * melebur ke halaman alur kerja manager.
 * (Perubahan atas persetujuan pemilik; jalur STAFF di NAV_GROUPS tak tersentuh.)
 */
const MANAGER_KPAK_GROUPS: NavGroup[] = [
  {
    title: "Kerja Harian",
    items: [
      {
        label: "Pusat Kerja",
        href: "/dashboard/kpak/workflow",
        icon: <LayoutDashboard size={20} />,
        roles: ["MANAGER"],
        kpakOnly: true,
      },
      {
        label: "Kru & Kinerja",
        href: "/dashboard/kpak/crew",
        icon: <Users size={20} />,
        roles: ["MANAGER"],
        kpakOnly: true,
        badgeKey: "crew",
      },
      {
        label: "Perlu Keputusan",
        href: "/dashboard/kpak/review",
        icon: <ClipboardList size={20} />,
        roles: ["MANAGER"],
        kpakOnly: true,
        badgeKey: "review",
      },
      {
        label: "Tutup Hari",
        href: "/dashboard/kpak/close-day",
        icon: <Clock size={20} />,
        roles: ["MANAGER"],
        kpakOnly: true,
      },
    ],
  },
  {
    title: "Kelola",
    items: [
      {
        label: "Anggaran Saya",
        href: "/dashboard/kpak/my-budget",
        icon: <Wallet size={20} />,
        roles: ["MANAGER"],
        kpakOnly: true,
      },
      {
        label: "Rekap & Laporan",
        href: "/dashboard/kpak/reports",
        icon: <BarChart3 size={20} />,
        roles: ["MANAGER"],
        kpakOnly: true,
      },
      {
        label: "Data Santri",
        href: "/dashboard/kpak/students",
        icon: <BookOpen size={20} />,
        roles: ["MANAGER"],
        kpakOnly: true,
      },
    ],
  },
  {
    items: [
      {
        label: "Profil",
        href: "/dashboard/profile",
        icon: <User size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Keluar",
        href: "#",
        icon: <LogOut size={20} />,
        roles: ["MANAGER"],
      },
    ],
  },
];

/**
 * Menu khusus MANAGER unit Retail — disederhanakan fokus pekerjaan manager.
 * Stok Masuk (input) & Hitung Sisa (input) milik STAFF dan tidak tampil
 * di sini; route-nya tetap hidup untuk keadaan darurat.
 * Manager mengoperasikan: dashboard, shift saya, review batch, persetujuan
 * hitung sisa, belanja, konsinyasi/serah terima, POS, dan keuangan unit.
 * (Perubahan atas persetujuan pemilik; jalur STAFF di NAV_GROUPS tak tersentuh.)
 */
const MANAGER_RETAIL_GROUPS: NavGroup[] = [
  {
    title: "Kerja Harian",
    items: [
      {
        label: "Pusat Kerja",
        href: "/dashboard",
        icon: <LayoutDashboard size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Shift Saya",
        href: "/dashboard/retail/shift",
        icon: <Clock size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "POS",
        href: "/dashboard/pos",
        icon: <ShoppingCart size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Review Stok Masuk",
        href: "/dashboard/retail/stok-masuk/review",
        icon: <PackagePlus size={20} />,
        roles: ["MANAGER"],
        badgeKey: "batch",
      },
      {
        label: "Hitung Sisa",
        href: "/dashboard/retail/sisa",
        icon: <ClipboardCheck size={20} />,
        roles: ["MANAGER"],
        badgeKey: "count",
      },
    ],
  },
  {
    title: "Kelola",
    items: [
      {
        label: "Belanja Stok",
        href: "/dashboard/retail/belanja",
        icon: <ShoppingBag size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Inventori",
        href: "/dashboard/retail/inventory",
        icon: <Package size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Titipan UMKM",
        href: "/dashboard/retail/konsinyasi",
        icon: <Users size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Serah Terima",
        href: "/dashboard/retail/konsinyasi/serah-terima",
        icon: <ClipboardList size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Laporan Jualan",
        href: "/dashboard/retail/konsinyasi/laporan",
        icon: <BarChart3 size={20} />,
        roles: ["MANAGER"],
      },
    ],
  },
  {
    title: "Keuangan",
    items: [
      {
        label: "Buku Kas",
        href: "/dashboard/transactions",
        icon: <Receipt size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Pengajuan",
        href: "/dashboard/approvals",
        icon: <ClipboardList size={20} />,
        roles: ["MANAGER"],
        badgeKey: "review",
      },
      {
        label: "Laporan",
        href: "/dashboard/reports",
        icon: <BarChart3 size={20} />,
        roles: ["MANAGER"],
      },
    ],
  },
  {
    items: [
      {
        label: "Profil",
        href: "/dashboard/profile",
        icon: <User size={20} />,
        roles: ["MANAGER"],
      },
      {
        label: "Keluar",
        href: "#",
        icon: <LogOut size={20} />,
        roles: ["MANAGER"],
      },
    ],
  },
];

/**
 * Menu khusus PIMPINAN — sederhana, fokus tugas kepemimpinan.
 * Hanya navigasi tingkat lembaga: dashboard/pantauan, keputusan, buku kas,
 * laporan, dan pegawai. Menu operasional & layanan unit (KPAK, tabungan,
 * rekonsiliasi, handover) dihapus agar fokus pimpinan; akses rutenya pun
 * diblok untuk PIMPINAN di middleware (role lain tetap bisa).
 * (Perubahan atas persetujuan pemilik; jalur role lain di NAV_GROUPS tak tersentuh.)
 */
const PIMPINAN_GROUPS: NavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard size={20} />,
        roles: ["PIMPINAN"],
      },
      {
        label: "Papan Pantau",
        href: "/dashboard/monitor",
        icon: <Monitor size={20} />,
        roles: ["PIMPINAN"],
      },
      {
        label: "Pengumuman",
        href: "/dashboard/announcements",
        icon: <Bell size={20} />,
        roles: ["PIMPINAN"],
      },
    ],
  },
  {
    title: "Keuangan Lembaga",
    items: [
      {
        label: "Buku Kas",
        href: "/dashboard/transactions",
        icon: <Receipt size={20} />,
        roles: ["PIMPINAN"],
      },
      {
        label: "Pengajuan",
        href: "/dashboard/approvals",
        icon: <ClipboardList size={20} />,
        roles: ["PIMPINAN"],
        badgeKey: "review",
      },
      {
        label: "Laporan",
        href: "/dashboard/reports",
        icon: <BarChart3 size={20} />,
        roles: ["PIMPINAN"],
      },
    ],
  },
  {
    title: "Kepegawaian",
    items: [
      {
        label: "Pegawai",
        href: "/dashboard/users",
        icon: <Users size={20} />,
        roles: ["PIMPINAN"],
      },
    ],
  },
  {
    items: [
      {
        label: "Profil",
        href: "/dashboard/profile",
        icon: <User size={20} />,
        roles: ["PIMPINAN"],
      },
      {
        label: "Keluar",
        href: "#",
        icon: <LogOut size={20} />,
        roles: ["PIMPINAN"],
      },
    ],
  },
];

export function Sidebar({
  user,
  expanded,
  onToggle,
  mobileOpen = false,
  onCloseMobile,
  className,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const role = user?.role || "STAFF";
  const canUseRetailModules =
    role === "SUPERADMIN" || user?.unitIsRetail === true;
  const isStaffRetail = role === "STAFF" && user?.unitIsRetail === true;

  const shiftGate = useShiftGate();
  const isStaffKpak = shiftGate.gated;
  const isManagerKpak = role === "MANAGER" && user?.unitType === "KPAK";
  const isManagerRetail =
    role === "MANAGER" && user?.unitIsRetail === true && user?.unitType !== "KPAK";
  const isPimpinan = role === "PIMPINAN";

  // Badge pantau live khusus Manager (KPAK: review/crew; Retail: batch/count/review).
  const [badges, setBadges] = useState<{
    review: number;
    crew: number;
    batch: number;
    count: number;
  }>({
    review: 0,
    crew: 0,
    batch: 0,
    count: 0,
  });
  useEffect(() => {
    let on = true;
    const clear = () => {
      if (!on) return;
      setBadges({ review: 0, crew: 0, batch: 0, count: 0 });
    };
    if (!isManagerKpak && !isManagerRetail && !isPimpinan) {
      clear();
      return () => {
        on = false;
      };
    }
    const fetchBadges = async () => {
      try {
        if (isPimpinan) {
          // Badge Pimpinan: jumlah pengajuan menunggu persetujuan.
          const apprRes = await fetch("/api/approvals").catch(() => null);
          let review = 0;
          if (apprRes && apprRes.ok) {
            const j = await apprRes.json();
            review += ((j.data ?? []) as any[]).filter(
              (a) => a.status === "PENDING",
            ).length;
          }
          if (on) setBadges({ review, crew: 0, batch: 0, count: 0 });
          return;
        }
        if (isManagerRetail) {
          const [apprRes, batchRes, sisaRes] = await Promise.all([
            fetch("/api/approvals").catch(() => null),
            fetch("/api/retail/batches?status=DRAFT&limit=200").catch(() => null),
            fetch("/api/retail/sisa?limit=200").catch(() => null),
          ]);
          let review = 0;
          let batch = 0;
          let count = 0;
          if (apprRes && apprRes.ok) {
            const j = await apprRes.json();
            review += ((j.data ?? []) as any[]).filter((a) => a.status === "PENDING").length;
          }
          if (batchRes && batchRes.ok) {
            const j = await batchRes.json();
            batch += ((j.data ?? []) as any[]).filter((b) => b.status === "DRAFT").length;
          }
          if (sisaRes && sisaRes.ok) {
            const j = await sisaRes.json();
            count += ((j?.data?.history ?? []) as any[]).filter(
              (s) => s.status === "DRAFT",
            ).length;
          }
          if (on) setBadges({ review, crew: 0, batch, count });
          return;
        }
        const [apprRes, repRes, shiftRes] = await Promise.all([
          fetch("/api/approvals").catch(() => null),
          fetch("/api/kpak/shift-reports").catch(() => null),
          fetch("/api/kpak/shift").catch(() => null),
        ]);
        let review = 0;
        let crew = 0;
        if (apprRes && apprRes.ok) {
          const j = await apprRes.json();
          review += ((j.data ?? []) as any[]).filter((a) => a.status === "PENDING").length;
        }
        if (repRes && repRes.ok) {
          const j = await repRes.json();
          review += ((j?.data?.reports ?? []) as any[]).filter(
            (r) => r.status !== "ACCEPTED",
          ).length;
        }
        if (shiftRes && shiftRes.ok) {
          const j = await shiftRes.json();
          crew = ((j?.data?.crew ?? []) as any[]).filter(
            (c) => c.attendance && !c.attendance.checkOutAt,
          ).length;
        }
        if (on) setBadges({ review, crew, batch: 0, count: 0 });
      } catch {
        // abaikan — badge opsional
      }
    };
    fetchBadges();
    // Tanpa polling: badge dimuat ulang dari backend setiap navigasi (pathname).
    return () => {
      on = false;
    };
  }, [isManagerKpak, isManagerRetail, isPimpinan, pathname]);

  const canSeeItem = (item: NavItem) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.nonRetailOnly && canUseRetailModules) return false;
    if (item.retailOnly && !canUseRetailModules) return false;
    if (item.staffRetailOnly && !isStaffRetail) return false;
    if (item.hideForStaffRetail && isStaffRetail) return false;
    if (item.kpakOnly && user?.unitType !== "KPAK" && role !== "SUPERADMIN")
      return false;
    if (item.hideForKpak && user?.unitType === "KPAK") return false;
    // Staff KPAK: tanpa check-in hanya Shift/Data/Rekap; ikut layanan shift
    if (isStaffKpak) {
      const tabunganOnly = ["/dashboard/savings"];
      const keuanganOnly = ["/dashboard/kpak/finance"];
      const lockedForAll = ["/dashboard/kpak/budget"];
      if (lockedForAll.includes(item.href)) {
        if (!shiftGate.active || shiftGate.loading) return false;
      }
      if (!shiftGate.active || shiftGate.loading) {
        if (tabunganOnly.includes(item.href) || keuanganOnly.includes(item.href))
          return false;
      } else if (shiftGate.service === "TABUNGAN") {
        if (keuanganOnly.includes(item.href)) return false;
      } else if (shiftGate.service === "KEUANGAN") {
        if (tabunganOnly.includes(item.href)) return false;
      }
    }
    return true;
  };

  const baseGroups = isManagerKpak
    ? MANAGER_KPAK_GROUPS
    : isManagerRetail
      ? MANAGER_RETAIL_GROUPS
      : role === "PIMPINAN"
        ? PIMPINAN_GROUPS
        : NAV_GROUPS;
  const visibleGroups = baseGroups.map((g) => ({
    ...g,
    items: g.items.filter(canSeeItem),
  })).filter((g) => g.items.length > 0);
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    onCloseMobile?.();
    // The drawer should close only after navigation, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseMobile?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px] md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col overflow-y-auto border-r border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] shadow-[10px_0_30px_rgba(15,23,42,0.05)] transition-transform duration-300 ease-out dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.98))] md:relative md:z-auto md:min-h-screen md:w-auto md:translate-x-0 md:bg-card/90 md:backdrop-blur-xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${expanded ? "md:w-64" : "md:w-20"} ${className || ""}`}
        style={{ height: "calc(100vh - env(safe-area-inset-bottom))" }}
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-border bg-card shadow-sm flex-shrink-0">
              <Image
                src="/logo-baru.png"
                alt="Logo Al-Basyariyah"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            {expanded && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-semibold text-foreground leading-tight whitespace-nowrap">
                  AL-Basyariyah Finance
                </h1>
                <p className="text-[10px] text-muted-foreground leading-none whitespace-nowrap">
                  Pondok Pesantren Al-Basyariyah
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => (mobileOpen ? onCloseMobile?.() : onToggle())}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary md:h-8 md:w-8"
            title={expanded ? "Sempitkan" : "Perluas"}
            aria-label={expanded ? "Sempitkan sidebar" : "Perluas sidebar"}
          >
            <span className="md:hidden">
              <ChevronLeft size={18} />
            </span>
            <span className="hidden md:inline">
              {expanded ? (
                <ChevronLeft size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </span>
          </button>
        </div>

        {/* User Info - Only when expanded */}
        {expanded && user && (
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-3">
              {user?.image ? (
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-islamic-500 to-islamic-600 flex items-center justify-center overflow-hidden border-2 border-white/50 shadow-inner shadow-lg">
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    fill
                    className="object-cover rounded-full"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-islamic-500 to-islamic-600 flex items-center justify-center border-2 border-white/50 shadow-inner shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate capitalize">
                  {role}
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
          {visibleGroups.map((group, gi) => (
            <div key={gi}>
              {group.title && expanded && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.title}
                </p>
              )}
              {group.title && !expanded && (
                <div className="mx-3 mb-1 border-b border-border/50" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const activeItem = isActive(item.href);
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        if (item.href === "#") signOut();
                        else router.push(item.href);
                        onCloseMobile?.();
                      }}
                      className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-200 ${
                        activeItem
                          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10 font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      title={expanded ? undefined : item.label}
                    >
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {item.icon}
                      </div>
                      {expanded && (
                        <span className="font-medium text-sm whitespace-nowrap truncate flex-1 text-left">
                          {item.label}
                        </span>
                      )}
                      {expanded && badgeCount > 0 && (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                            item.badgeKey === "crew"
                              ? "bg-emerald-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: Version info when expanded */}
        {expanded && (
          <div className="p-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground/70 text-center">
              ALBA Finance v3
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
