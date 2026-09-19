"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-red-100 p-4 shadow-sm">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Terjadi Kesalahan
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Kami tidak dapat memuat halaman ini. Mohon coba lagi atau hubungi
          administrator.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        <RotateCcw size={16} />
        <span>Coba Lagi</span>
      </button>
    </div>
  );
}
