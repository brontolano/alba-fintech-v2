"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Administrasi Internal digabung ke Layanan Keuangan (tab Internal).
// Rute ini dipertahankan agar bookmark/menu lama tidak 404.
export default function KpakInternalRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/kpak/finance?tab=internal");
  }, [router]);
  return (
    <p className="py-12 text-center text-sm text-muted-foreground">
      Mengalihkan ke Layanan Keuangan…
    </p>
  );
}
