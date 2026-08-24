'use client';

// Redirect ke halaman transaksi yang sudah ada
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperadminUsersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect ke manajemen user
    router.replace('/dashboard/superadmin/users');
  }, [router]);

  return (
    <div className="p-6">
      <p className="text-slate-500">Memuat manajemen user...</p>
    </div>
  );
}
