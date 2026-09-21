import { ArrowLeftRight, Landmark, ReceiptText, UserPlus } from "lucide-react";
import { AnjunganShell, type AnjunganAction } from "@/components/kiosk/AnjunganShell";

const actions: AnjunganAction[] = [
  {
    href: "/dashboard/savings",
    icon: UserPlus,
    label: "Pendaftaran Santri",
    description: "Tambah santri baru & buka tabungan",
    variant: "violet",
  },
  {
    href: "/dashboard/transactions/create",
    icon: ArrowLeftRight,
    label: "Transaksi Internal Pondok",
    description: "Catat pemasukan & pengeluaran KPAK",
    variant: "emerald",
  },
  {
    href: "/dashboard/transactions",
    icon: ReceiptText,
    label: "Buku Kas & Riwayat",
    description: "Lihat catatan transaksi harian",
    variant: "sky",
  },
];

export default function KioskKpakPage() {
  return (
    <AnjunganShell
      logo={Landmark}
      title="Anjungan KPAK"
      description="Administrasi keuangan pondok — pendaftaran, daftar ulang, dan pencatatan transaksi internal."
      actions={actions}
      footer="KPAK · Kantor Pelayanan Administrasi Keuangan"
    />
  );
}