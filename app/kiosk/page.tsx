import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Crown,
  Landmark,
  MonitorSmartphone,
  PiggyBank,
  ShoppingCart,
} from "lucide-react";

const kiosks = [
  {
    href: "/kiosk/savings",
    icon: PiggyBank,
    title: "Anjungan Tabungan",
    desc: "Cek saldo & mutasi tabungan santri",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    href: "/kiosk/kpak",
    icon: Landmark,
    title: "Anjungan KPAK",
    desc: "Administrasi keuangan: pendaftaran & transaksi internal pondok",
    color: "bg-violet-100 text-violet-700",
  },
  {
    href: "/kiosk/pos",
    icon: ShoppingCart,
    title: "Anjungan POS",
    desc: "Kasir kantin & koperasi, lengkap dengan stok barang",
    color: "bg-amber-100 text-amber-700",
  },
  {
    href: "/kiosk/close",
    icon: ClipboardCheck,
    title: "Pengajuan & Tutup Buku",
    desc: "Persetujuan transaksi dan rekonsiliasi tutup buku unit",
    color: "bg-sky-100 text-sky-700",
  },
  {
    href: "/kiosk/pimpinan",
    icon: Crown,
    title: "Anjungan Pimpinan",
    desc: "Papan pantau, laporan & persetujuan untuk pimpinan",
    color: "bg-rose-100 text-rose-700",
  },
];

export default function KioskHubPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-primary/10 to-background px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
            <MonitorSmartphone size={40} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Anjungan Layanan Al-Basyariyah
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Pilih anjungan sesuai kebutuhan untuk memudahkan operasional dan
            pelayanan santri.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kiosks.map((k) => (
            <Link
              key={k.href}
              href={k.href}
              className="group flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${k.color}`}
              >
                <k.icon size={32} />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-semibold">{k.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {k.desc}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Buka Anjungan
                <ArrowRight
                  size={16}
                  className="transition group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Anjungan layanan Pondok Pesantren Al-Basyariyah · cek saldo dapat
          dilakukan tanpa login
        </p>
      </div>
    </main>
  );
}