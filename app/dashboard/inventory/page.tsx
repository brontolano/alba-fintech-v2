import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const units = ['KPAK', 'Koperasi Buku', 'Kantin Umi', 'Kantin Baru'];

  // Mock inventory data
  const inventoryItems = [
    {
      id: '1',
      name: 'Buku Tulis A4',
      sku: 'BK001',
      category: 'Buku',
      unit: 'Koperasi Buku',
      currentStock: 150,
      minStock: 50,
      unitPrice: 5000,
      purchasePrice: 3500,
      isActive: true,
    },
    {
      id: '2',
      name: 'Pensil Baru',
      sku: 'PG001',
      category: 'Alat Tulis',
      unit: 'Koperasi Buku',
      currentStock: 320,
      minStock: 100,
      unitPrice: 3000,
      purchasePrice: 2000,
      isActive: true,
    },
    {
      id: '3',
      name: 'Mie Instan',
      sku: 'MN001',
      category: 'Makanan',
      unit: 'Kantin Umi',
      currentStock: 45,
      minStock: 20,
      unitPrice: 4500,
      purchasePrice: 3200,
      isActive: true,
    },
    {
      id: '4',
      name: 'Minuman Soda',
      sku: 'DR001',
      category: 'Minuman',
      unit: 'Kantin Umi',
      currentStock: 78,
      minStock: 30,
      unitPrice: 5500,
      purchasePrice: 4000,
      isActive: true,
    },
    {
      id: '5',
      name: 'Roti Coklat',
      sku: 'FT001',
      category: 'Makanan',
      unit: 'Kantin Baru',
      currentStock: 25,
      minStock: 50,
      unitPrice: 6000,
      purchasePrice: 4500,
      isActive: true,
    },
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return 'out';
    if (current <= min) return 'low';
    return 'good';
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case 'out':
        return (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            Habis
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
            Stok Rendah
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Tersedia
          </span>
        );
    }
  };

  const lowStockCount = inventoryItems.filter(
    (item) => getStockStatus(item.currentStock, item.minStock) !== 'good'
  ).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventori Barang</h1>
          <p className="text-slate-600 mt-1">
            Kelola stok barang untuk unit retail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
            <Plus size={18} />
            <span>Tambah Barang</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">
                Total Barang
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {inventoryItems.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">
                Stok Rendah
              </p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">
                Nilai Stok
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(
                  inventoryItems.reduce(
                    (sum, item) =>
                      sum + item.currentStock * item.unitPrice,
                    0
                  )
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">
                Unit Aktif
              </p>
              <p className="text-2xl font-bold text-slate-800">
                3 / {units.filter(() => true).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari barang..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="">Semua Unit</option>
            <option value="koperasi">Koperasi Buku</option>
            <option value="kantin-umi">Kantin Umi</option>
            <option value="kantin-baru">Kantin Baru</option>
          </select>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="">Semua Kategori</option>
            <option value="buku">Buku</option>
            <option value="alat-tulis">Alat Tulis</option>
            <option value="makanan">Makanan</option>
            <option value="minuman">Minuman</option>
          </select>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="all">Semua Status Stok</option>
            <option value="low">Stok Rendah</option>
            <option value="good">Tersedia</option>
            <option value="out">Habis</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  #
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Nama Barang
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  SKU
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Kategori
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Unit
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Stok
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Harga Beli
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Harga Jual
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Nilai
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map((item, idx) => {
                const stockStatus = getStockStatus(
                  item.currentStock,
                  item.minStock
                );
                const totalValue = item.currentStock * item.unitPrice;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {item.sku}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`text-sm font-medium ${
                          stockStatus === 'good'
                            ? 'text-green-600'
                            : stockStatus === 'low'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {item.currentStock} / {item.minStock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">
                      {formatCurrency(item.purchasePrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-emerald-600">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-800 font-medium">
                      {formatCurrency(totalValue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStockBadge(stockStatus)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-1">
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
