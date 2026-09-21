import { BarChart3, ClipboardCheck, Scale, Send } from "lucide-react";
import { AnjunganShell, type AnjunganAction } from "@/components/kiosk/AnjunganShell";

const actions: AnjunganAction[] = [
  {
    href: "/dashboard/transactions/create",
    icon: Send,
    label: "Ajukan Transaksi",
    description: "Buat transaksi yang perlu persetujuan",
    variant: "violet",
  },
  {
    href: "/dashboard/approvals",
    icon: ClipboardCheck,
    label: "Persetujuan",
    description: "Approve / tolak pengajuan transaksi",
    variant: "sky",
  },
  {
    href: "/dashboard/reconciliation",
    icon: Scale,
    label: "Tutup Buku & Rekonsiliasi",
    description: "Cocokkan saldo unit sebelum tutup buku",
    variant: "emerald",
  },
  {
    href: "/dashboard/reports",
    icon: BarChart3,
    label: "Laporan Keuangan",
    description: "Lihat laporan pemasukan & pengeluaran",
    variant: "amber",
  },
];

export default function KioskClosePage() {
  return (
    <AnjunganShell
      logo={ClipboardCheck}
      title="Anjungan Pengajuan & Tutup Buku"
      description="Alur persetujuan transaksi dan rekonsiliasi tutup buku untuk tiap unit."
      actions={actions}
    />
  );
}