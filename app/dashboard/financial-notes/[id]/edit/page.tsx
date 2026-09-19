"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditFinancialNoteRoute() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    if (params.id) {
      router.replace(`/dashboard/financial-notes/create?edit=${params.id}`);
    }
  }, [params.id, router]);

  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
      Membuka formulir edit...
    </div>
  );
}
