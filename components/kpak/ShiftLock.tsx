"use client";

import { useEffect } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Layar kunci layanan staff: otomatis alihkan ke Shift Saya. */
export function ShiftLock({
  loading,
  active,
  needService,
}: {
  loading: boolean;
  active: boolean;
  needService: "TABUNGAN" | "KEUANGAN";
}) {
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => router.replace("/dashboard/kpak/shift"), 2500);
    return () => clearTimeout(t);
  }, [loading, router]);

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
            ? "Mengalihkan ke Shift Saya untuk check-in..."
            : `Shift ini untuk layanan ${needService === "TABUNGAN" ? "Keuangan" : "Tabungan"}. Mengalihkan...`}
        </p>
      </div>
      <Link
        href="/dashboard/kpak/shift"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Ke Shift Saya Sekarang
      </Link>
    </div>
  );
}
