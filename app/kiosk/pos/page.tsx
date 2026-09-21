import { Package, ReceiptText, ShoppingCart } from "lucide-react";
import { AnjunganShell, type AnjunganAction } from "@/components/kiosk/AnjunganShell";

const actions: AnjunganAction[] = [
  {
    href: "/dashboard/pos",
    icon: ShoppingCart,
    label: "Buka Kasir",
    description: "Layani penjualan cepat di kantin / koperasi",
    variant: "amber",
  },
  {
    href: "/dashboard/inventory",
    icon: Package,
    label: "Stok & Inventori",
    description: "Kelola barang, stok, dan pemasok",
    variant: "sky",
  },
  {
    href: "/dashboard/transactions/create",
    icon: ReceiptText,
    label: "Catat Transaksi",
    description: "Pencatatan pemasukan & pengeluaran unit",
    variant: "emerald",
  },
];

export default function KioskPosPage() {
  return (
    <AnjunganShell
      logo={ShoppingCart}
      title="Anjungan POS"
      description="Point of Sale untuk kantin & koperasi — kasir cepat lengkap dengan stok barang."
      actions={actions}
      footer="POS · Kantin Umi, Kantin Baru, Koperasi Buku"
    />
  );
}