'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, TrendingUp, TrendingDown, Package, ClipboardList } from 'lucide-react';

type DashboardData = {
    totalIncome: number;
    totalExpense: number;
    pendingApprovals: number;
    totalTransactions: number;
    lowStockItems: Array<{
        id: string;
        name: string;
        sku: string | null;
        currentStock: number;
        minStock: number;
    }>;
};

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'authenticated') return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/dashboard');
                if (!res.ok) throw new Error('Gagal memuat data dasbor');
                const json = await res.json();
                setData(json);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [status]);

    if (status === 'loading' || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <p className="text-red-600">Error: {error}</p>
            </div>
        );
    }

    if (!data) return null;

    const netIncome = data.totalIncome - data.totalExpense;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Dasbor</h1>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        Pemasukan
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                        {data.totalIncome.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        Pengeluaran
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                        {data.totalExpense.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">
                        {netIncome >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
                    </p>
                    <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(netIncome).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-orange-600" />
                        Persetujuan
                    </p>
                    <p className="text-2xl font-bold text-orange-600">{data.pendingApprovals}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        Stok Rendah
                    </p>
                    <p className="text-2xl font-bold text-purple-600">{data.lowStockItems.length}</p>
                </div>
            </div>

            {/* Low Stock Items */}
            {data.lowStockItems.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <h3 className="font-semibold mb-3 text-red-600">Peringatan Stok Rendah</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="pb-2">Nama Barang</th>
                                    <th className="pb-2">SKU</th>
                                    <th className="pb-2">Stok Sekarang</th>
                                    <th className="pb-2">Minimum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.lowStockItems.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="py-2">{item.name}</td>
                                        <td className="py-2">{item.sku || '-'}</td>
                                        <td className="py-2 text-red-600 font-semibold">{item.currentStock}</td>
                                        <td className="py-2">{item.minStock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Account Info */}
            <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">Informasi Akun</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Nama:</span>{' '}
                        {session?.user?.name || '-'}
                    </div>
                    <div>
                        <span className="text-gray-500">Email:</span>{' '}
                        {session?.user?.email || '-'}
                    </div>
                    <div>
                        <span className="text-gray-500">Role:</span>{' '}
                        <span className="font-medium">{session?.user?.role || '-'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Total Transaksi:</span>{' '}
                        <span className="font-medium">{data.totalTransactions}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
