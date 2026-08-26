'use client';

import { ShoppingCart, Package, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function POSPage() {
  const handleExport = () => {
    toast.info('Fitur ekspor akan tersedia di versi mendatang');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart size={24} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Point of Sale</h1>
            <p className="text-sm text-slate-500">Kelola penjualan dan kas harian</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">Rp 0</div>
              <p className="text-xs text-slate-500">Penjualan Hari Ini</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700">0</div>
              <p className="text-xs text-slate-500">Transaksi Hari Ini</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingDown size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-700">0%</div>
              <p className="text-xs text-slate-500">Margin</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <ShoppingCart size={20} className="text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-700">0</div>
              <p className="text-xs text-slate-500">Produk Terjual</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">POS Belum Tersedia</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Fitur Point of Sale akan tersedia dalam versi mendatang. Anda akan dapat
          mengelola penjualan, kas harian, dan laporan penjualan di sini.
        </p>
        <button
          onClick={() => toast.info('Fitur POS akan segera hadir!')}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
        >
          Pelajari Lebih Lanjut
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
        >
          <Download size={16} />
          Export
        </button>
      </div>
    </div>
  );
}
