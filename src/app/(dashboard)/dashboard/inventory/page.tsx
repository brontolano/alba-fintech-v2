'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Inventory Page (alias POS) — untuk mengelola stok barang
export default function InventoryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [items] = useState<string[]>(['Belum ada data inventory']);
  const role = session?.user?.role;

  if (sessionStatus === 'loading') {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold">Inventory / Stok Barang</h1>
            <p className="text-sm text-slate-500">Manajemen stok untuk Retails POS</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/pos" className="flex items-center gap-2">
            <ShoppingCart size={16} />
            Buka POS
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Stok</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-slate-500">Belum ada stok terdaftar.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="text-slate-600">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400 mt-4">
        Fitur inventory management akan dikembangkan pada phase selanjutnya.
        Gunakan <a href="/dashboard/pos" className="text-brand-600">Halaman POS</a> untuk transaksi harian.
      </p>
    </div>
  );
}
