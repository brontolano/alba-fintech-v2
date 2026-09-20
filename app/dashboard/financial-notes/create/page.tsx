"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateFinancialNotePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/transactions");
  }, [router]);

  return (
    <div className="rounded-[22px] border border-dashed border-border bg-card p-8 text-center">
      <h1 className="text-xl font-bold text-foreground">
        Formulir catatan keuangan dinonaktifkan
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Anda akan diarahkan ke transaksi operasional.
      </p>
    </div>
  );
}
