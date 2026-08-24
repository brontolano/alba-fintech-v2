'use client';

// Redirect halaman superadmin ke dashboard yang tepat
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperadminApprovalsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect ke halaman approvals yang sudah ada
    router.replace('/dashboard/approvals');
  }, [router]);

  return (
    <div className="p-6">
      <p className="text-slate-500">Redirecting ke manajemen approval...</p>
    </div>
  );
}
