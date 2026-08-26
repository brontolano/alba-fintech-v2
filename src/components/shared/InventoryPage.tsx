'use client';

import { useState } from 'react';
import { Package, Plus, Search, Edit, Trash2, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPage() {
  const [showImport, setShowImport] = useState(false);

  const handleImport = () => {
    setShowImport(true);
    toast.info('Fitur impor akan tersedia', {
      description: 'Import inventory via CSV akan hadir di versi mendatang.',
    });
  };

  const handleExport = () => {
    toast.info('Fitur ekspor akan tersedia', {
      description: 'Export inventory ke CSV akan hadir di versi mendatang.',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventaris</h1>
            <p className="text-sm text-slate-500">Kelola stok barang dan inventaris</p>
          </div>
        </div>
        <button
          onClick={() => toast.info('Fitur tambah barang akan tersedia di versi mendatang')}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center gap-2"
        >
          <Plus size={16} />
          Tambah Barang
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari barang..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
        />
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Package size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Belum Ada Inventaris</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Fitur inventaris akan tersedia dalam versi mendatang. Anda akan dapat mengelola
          stok barang, melacak kuantitas, dan memantau nilai inventaris di sini.
        </p>
        <button
          onClick={() => toast.info('Fitur inventaris akan segera hadir')}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
        >
          Pelajari Lebih Lanjut
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleImport}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
        >
          <Upload size={16} />
          Import
        </button>
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

