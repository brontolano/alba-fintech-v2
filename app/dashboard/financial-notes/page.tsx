"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FinancialNotesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/transactions");
  }, [router]);

  return (
    <div className="rounded-[22px] border border-dashed border-border bg-card p-8 text-center">
      <h1 className="text-xl font-bold text-foreground">
        Modul catatan keuangan sudah dinonaktifkan
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Gunakan transaksi operasional untuk mencatat pergerakan keuangan unit.
      </p>
    </div>
  );
}
