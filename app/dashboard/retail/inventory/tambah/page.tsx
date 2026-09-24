"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Halaman lama digabung ke wizard Stok Masuk (Pondok/Titipan).
// File dipertahankan sebagai redirect agar link lama tak 404.
export default function TambahRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/retail/stok-masuk");
  }, [router]);
  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="py-12 text-center text-muted-foreground">
        <Loader2 size={18} className="mx-auto animate-spin" />
        <p className="mt-2 text-sm">Mengalihkan ke Stok Masuk…</p>
      </div>
    </main>
  );
}
