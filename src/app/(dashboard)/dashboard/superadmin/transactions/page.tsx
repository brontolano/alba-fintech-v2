'use client';

// Redirect halaman superadmin ke dashboard yang tepat
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperadminTransactionsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect ke halaman transactions yang sudah ada
    router.replace('/dashboard/transactions');
  }, [router]);

  return (
    <div className="p-6">
      <p className="text-slate-500">Redirecting ke manajemen transaksi...</p>
    </div>
  );
}
