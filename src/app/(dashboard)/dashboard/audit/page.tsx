'use client';

import { useEffect, useState } from 'react';

export default function AuditLogPage() {
  const [logs] = useState<string[]>([]);

  useEffect(() => {
    // placeholder — akan isi dengan fetch /api/audit-logs
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Audit Log</h1>
      {logs.length === 0 ? (
        <p className="text-slate-500">Belum ada log tersedia.</p>
      ) : (
        <ul className="space-y-1">{/* logs.map(...) */}</ul>
      )}
    </div>
  );
}
