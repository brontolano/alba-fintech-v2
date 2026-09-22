"use client";

import { CalendarCheck, Loader2 } from "lucide-react";
import Link from "next/link";

/** Layar kunci layanan staff: wajib check-in (dan layanan sesuai) dulu. */
export function ShiftLock({
  loading,
  active,
  needService,
}: {
  loading: boolean;
  active: boolean;
  needService: "TABUNGAN" | "KEUANGAN";
}) {
  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
        Mengecek shift...
      </p>
    );
  }
  return (
    <div className="mx-auto max-w-md space-y-4 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CalendarCheck size={26} />
      </div>
      <div>
        <h1 className="text-xl font-bold">
          {!active ? "Belum Check-in" : "Salah Layanan Shift"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {!active
            ? "Check-in dulu di Shift Saya untuk membuka layanan."
            : `Shift ini untuk layanan ${needService === "TABUNGAN" ? "Keuangan" : "Tabungan"}. Check-out lalu check-in ulang dengan layanan ${needService === "TABUNGAN" ? "Tabungan" : "Keuangan"} untuk membuka halaman ini.`}
        </p>
      </div>
      <Link
        href="/dashboard/kpak/shift"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Ke Shift Saya
      </Link>
    </div>
  );
}
