'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart, Package, CheckCircle, XCircle } from 'lucide-react';

// Simple notification state
const useNotification = () => {
    const [message, setMessage] = useState<string | null>(null);
    const [type, setType] = useState<'success' | 'error' | 'info'>('info');
    const show = (msg: string, t: 'success' | 'error' | 'info' = 'info') => {
        setMessage(msg);
        setType(t);
        setTimeout(() => setMessage(null), 4000);
    };
    return { message, type, show };
};

interface InventoryItem {
    id: string;
    name: string;
    sku: string | null;
    currentStock: number;
    minStock: number;
    sellPrice: number;
}

interface Category {
    id: string;
    name: string;
    code: string;
    type: string;
}

interface BankAccount {
    id: string;
    name: string;
    bankName: string | null;
}

interface Item {
    itemId: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
}

export default function POSPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const notify = useNotification();

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [selectedItems, setSelectedItems] = useState<Item[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCategorySelector, setShowCategorySelector] = useState(false);
    const [showAccountSelector, setShowAccountSelector] = useState(false);
    const [selectedItemsForStock, setSelectedItemsForStock] = useState<string[]>([]);

    // Transaction form
    const [description, setDescription] = useState('');
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

    const user = session?.user;

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetchInventory();
            fetchCategories();
            fetchBankAccounts();
        }
    }, [status, router]);

    const fetchInventory = async () => {
        try {
            const res = await fetch('/api/inventory');
            if (!res.ok) throw new Error('Gagal memuat inventory');
            const data = await res.json();
            setInventory(data.data || []);
        } catch (error) {
            notify.show('Gagal memuat data inventory', 'error');
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/financial-categories');
            if (!res.ok) throw new Error('Gagal memuat kategori');
            const data = await res.json();
            setCategories(data.data || []);
        } catch (error) {
            notify.show('Gagal memuat kategori', 'error');
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const res = await fetch('/api/bank-accounts');
            if (!res.ok) throw new Error('Gagal memuat rekening');
            const data = await res.json();
            setBankAccounts(data.data || []);
        } catch (error) {
            notify.show('Gagal memuat rekening bank', 'error');
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAddItem = (item: InventoryItem) => {
        if (item.currentStock <= 0) {
            notify.show(`${item.name} tidak tersedia`, 'error');
            return;
        }

        const existingItem = selectedItems.find(i => i.itemId === item.id);
        if (existingItem) {
            const newItems = selectedItems.map(i =>
                i.itemId === item.id
                    ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * item.sellPrice }
                    : i
            );
            setSelectedItems(newItems);
        } else {
            setSelectedItems([...selectedItems, {
                itemId: item.id,
                name: item.name,
                quantity: 1,
                price: item.sellPrice,
                total: item.sellPrice
            }]);
        }

        setSelectedItemsForStock(prev => [...new Set([...prev, item.id])]);
    };

    const handleRemoveItem = (itemId: string) => {
        const item = selectedItems.find(i => i.itemId === itemId);
        if (!item) return;

        const newItems = selectedItems.filter(i => i.itemId !== itemId);
        setSelectedItems(newItems);
    };

    const handleQuantityChange = (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            handleRemoveItem(itemId);
            return;
        }

        const newItems = selectedItems.map(i =>
            i.itemId === itemId
                ? { ...i, quantity, total: quantity * i.price }
                : i
        );
        setSelectedItems(newItems);
    };

    const calculateTotal = () => {
        return selectedItems.reduce((sum, item) => sum + item.total, 0);
    };

    const resetForm = () => {
        setSelectedItems([]);
        setDescription('');
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setSelectedCategoryId('');
        setSelectedAccountId('');
        setSelectedItemsForStock([]);
        setShowCategorySelector(false);
        setShowAccountSelector(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCategoryId) {
            notify.show('Pilih kategori transaksi', 'error');
            return;
        }

        if (selectedItems.length === 0) {
            notify.show('Tambahkan barang ke keranjang', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'INCOME',
                    amount: calculateTotal().toString(),
                    description: description || 'Penjualan POS',
                    date: transactionDate,
                    categoryId: selectedCategoryId,
                    accountId: selectedAccountId || undefined,
                    orderItems: selectedItems,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Gagal membuat transaksi');
            }

            const transaction = await res.json();

            // Trigger stock refresh
            await fetchInventory();

            notify.show(`Transaksi #${transaction.id} berhasil dibuat`, 'success');

            resetForm();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Gagal menyimpan transaksi';
            notify.show(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                Point of Sale
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Transaction Info */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-semibold mb-3">Info Transaksi</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tanggal
                            </label>
                            <input
                                type="date"
                                value={transactionDate}
                                onChange={(e) => setTransactionDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Kategori *
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowCategorySelector(!showCategorySelector)}
                                className={`w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 text-left flex justify-between items-center`}
                            >
                                <span className={selectedCategoryId ? 'text-gray-900' : 'text-gray-500'}>
                                    {selectedCategoryId
                                        ? categories.find(c => c.id === selectedCategoryId)?.name || 'Pilih kategori'
                                        : 'Pilih kategori'}
                                </span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {showCategorySelector && (
                                <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategoryId(cat.id);
                                                setShowCategorySelector(false);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0"
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rekening
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowAccountSelector(!showAccountSelector)}
                                className={`w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 text-left flex justify-between items-center`}
                            >
                                <span className={selectedAccountId ? 'text-gray-900' : 'text-gray-500'}>
                                    {selectedAccountId
                                        ? `${bankAccounts.find(a => a.id === selectedAccountId)?.name} (${bankAccounts.find(a => a.id === selectedAccountId)?.bankName})`
                                        : 'Tidak ada rekening'}
                                </span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {showAccountSelector && (
                                <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto">
                                    {bankAccounts.length > 0 ? (
                                        bankAccounts.map(acc => (
                                            <button
                                                key={acc.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAccountId(acc.id);
                                                    setShowAccountSelector(false);
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0"
                                            >
                                                {acc.name} ({acc.bankName || 'Tanpa bank'})
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-gray-500">Tidak ada rekening tersedia</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-lg shadow p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Keterangan
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tulis keterangan transaksi..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        rows={2}
                    />
                </div>

                {/* Cart Summary */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Keranjang ({selectedItems.length} item)
                    </h2>

                    {selectedItems.length === 0 ? (
                        <p className="text-gray-500 py-4 text-center">Belum ada item ditambahkan</p>
                    ) : (
                        <div className="space-y-2">
                            {selectedItems.map(item => {
                                const inventoryItem = inventory.find(i => i.id === item.itemId);
                                return (
                                    <div key={item.itemId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                                        <div className="flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-gray-600">
                                                Stok tersedia: {inventoryItem?.currentStock || 0}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(item.itemId, item.quantity - 1)}
                                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-100"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(item.itemId, item.quantity + 1)}
                                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-100"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="font-medium w-20 text-right">Rp {item.total.toLocaleString('id-ID')}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.itemId)}
                                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}

                            <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span>Total</span>
                                    <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Product Selection */}
                {showCategorySelector && categories.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-lg font-semibold mb-3">Pilih Barang</h2>

                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Cari barang..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                            {filteredInventory.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleAddItem(item)}
                                    className={`border rounded-md p-3 cursor-pointer hover:shadow-md transition-shadow ${selectedItemsForStock.includes(item.id)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                                            <p className="text-sm text-gray-600">Stok: {item.currentStock}</p>
                                            <p className="font-medium text-blue-600">Rp {item.sellPrice?.toLocaleString('id-ID')}</p>
                                        </div>
                                        {selectedItemsForStock.includes(item.id) && (
                                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Submit */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting || selectedItems.length === 0 || !selectedCategoryId}
                        className="flex-1 bg-blue-600 text-white rounded-md py-3 px-4 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Buat Transaksi
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={resetForm}
                        className="px-6 bg-gray-100 text-gray-700 rounded-md py-3 hover:bg-gray-200"
                    >
                        Reset
                    </button>
                </div>
            </form>

            {/* Notifications */}
            {notify.message && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg ${notify.type === 'success' ? 'bg-green-500 text-white' :
                    notify.type === 'error' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {notify.message}
                </div>
            )}
        </div>
    );
}