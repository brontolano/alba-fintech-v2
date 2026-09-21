import {
  BarChart3,
  Crown,
  MonitorSmartphone,
  ShieldCheck,
  StickyNote,
} from "lucide-react";
import { AnjunganShell, type AnjunganAction } from "@/components/kiosk/AnjunganShell";

const actions: AnjunganAction[] = [
  {
    href: "/dashboard/monitor",
    icon: MonitorSmartphone,
    label: "Papan Pantau",
    description: "Ringkasan keuangan semua unit",
    variant: "emerald",
  },
  {
    href: "/dashboard/reports",
    icon: BarChart3,
    label: "Laporan Semua Unit",
    description: "Laporan pemasukan & pengeluaran lengkap",
    variant: "sky",
  },
  {
    href: "/dashboard/approvals",
    icon: ShieldCheck,
    label: "Persetujuan",
    description: "Approve / tolak pengajuan dari unit",
    variant: "violet",
  },
  {
    href: "/dashboard/financial-notes",
    icon: StickyNote,
    label: "Catatan Keuangan",
    description: "Catatan pemasukan / pengeluaran pimpinan",
    variant: "amber",
  },
];

export default function KioskPimpinanPage() {
  return (
    <AnjunganShell
      logo={Crown}
      title="Anjungan Pimpinan"
      description="Ringkasan sederhana untuk pimpinan pondok — pantau, setujui, dan jaga kondisi keuangan."
      actions={actions}
    />
  );
}