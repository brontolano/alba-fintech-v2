'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Save,
  Printer,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface CartItem {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  type: 'INCOME' | 'EXPENSE';
}

const MOCK_PRODUCTS = [
  { code: 'BRG001', name: 'Kopi Hitam', price: 5000, type: 'INCOME' as const },
  { code: 'BRG002', name: 'Teh Manis', price: 6000, type: 'INCOME' as const },
  { code: 'BRG003', name: 'Air Mineral', price: 3000, type: 'INCOME' as const },
  { code: 'BRG004', name: 'Gaji Karyawan', price: 0, type: 'EXPENSE' as const },
  { code: 'BRG005', name: 'Beras', price: 0, type: 'EXPENSE' as const },
];

export default function PosPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const role = session?.user?.role as string | undefined;
  const canCreate = ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'].includes(role ?? '');

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (res.ok) {
        const data = await res.json();
        setUnits((data.data || []).filter((u: { isActive: boolean }) => u.isActive));
        if (data.data?.length > 0) {
          setSelectedUnit(
            data.data.find((u: Unit & { isActive: boolean }) => u.isActive)?.id ||
            ''
          );
        }
      }
    } catch {
      // units
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const addToCart = (product: (typeof MOCK_PRODUCTS)[0]) => {
    const existing = cart.find((c) => c.productCode === product.code);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.productCode === product.code
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: Date.now().toString(),
          productCode: product.code,
          productName: product.name,
          quantity: 1,
          price: product.price,
          type: product.type,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find((c) => c.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
      setCart(cart.filter((c) => c.id !== id));
    } else {
      setCart(
        cart.map((c) =>
          c.id === id ? { ...c, quantity: newQty } : c
        )
      );
    }
  };

  const setCustomPrice = (id: string, price: number) => {
    setCart(
      cart.map((c) =>
        c.id === id ? { ...c, price } : c
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setNotes('');
    setSubmitError('');
    setSubmitSuccess('');
  };

  const totalIncome = cart
    .filter((c) => c.type === 'INCOME')
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  const totalExpense = cart
    .filter((c) => c.type === 'EXPENSE')
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    const lower = searchTerm.toLowerCase();
    return (
      p.code.toLowerCase().includes(lower) ||
      p.name.toLowerCase().includes(lower)
    );
  });

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setSubmitError('Keranjang kosong');
      return;
    }

    if (!selectedUnit) {
      setSubmitError('Pilih unit dulu');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      // Submit each cart item as a transaction
      const results = [];
      for (const item of cart) {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId: selectedUnit,
            type: item.type,
            amount: item.price * item.quantity,
            description: `${item.productName} x${item.quantity}` + (notes ? ` — ${notes}` : ''),
            ...(item.productCode && { reference: item.productCode }),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          results.push({ success: false, item: item.productName, error: data.error || data.message });
        } else {
          results.push({ success: true, item: item.productName });
        }
      }

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        setSubmitError(`${failed.length} transaksi gagal: ${failed.map((f) => `${f.item} (${f.error})`).join(', ')}`);
      } else {
        setSubmitSuccess(`✅ ${cart.length} transaksi berhasil dibuat (semua PENDING approval)`);
        clearCart();
        // Auto-navigate ke halaman transaksi setelah 2 detik
        setTimeout(() => {
          router.push('/dashboard/transactions');
        }, 2000);
      }
    } catch (e) {
      setSubmitError('Gagal memproses transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === 'loading') {
    return <div className="p-6">Loading...</div>;
  }

  if (!session || !canCreate) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Akses ditolak — hanya Staff ke atas yang bisa akses POS.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart size={28} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Retail POS</h1>
            <p className="text-sm text-slate-500">Point of Sale — transaksi cepat</p>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Printer size={16} className="mr-2" />
              Cetak Nota
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cetak Nota Penjualan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Fitur cetak nota akan tersedia di versi berikutnya.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Product List */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari produk (kode / nama)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Pilih Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.code}
                onClick={() => addToCart(product)}
                className="border border-slate-200 rounded-lg p-3 text-left hover:border-brand-500 hover:bg-brand-50 transition"
              >
                <div className="font-medium text-sm">{product.name}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {product.code}
                </div>
                {product.price > 0 && (
                  <div className="text-xs text-slate-600">
                    Rp {product.price.toLocaleString('id-ID')}
                  </div>
                )}
                <div className="mt-1">
                  <Badge
                    variant={product.type === 'INCOME' ? 'success' : 'outline'}
                    className="text-xs"
                  >
                    {product.type === 'INCOME' ? 'Jual' : 'Beli'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-80 border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart size={18} />
              Keranjang ({cart.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <ShoppingCart size={32} className="mx-auto mb-2" />
                <p>Keranjang kosong</p>
                <p className="text-xs">Pilih produk untuk mulai transaksi</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{item.productName}</div>
                    <Badge variant="outline" className="text-xs">
                      {item.productCode}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-500">
                    {item.type === 'INCOME' ? 'Jual' : 'Beli'} •{' '}
                    <span
                      className={
                        item.type === 'INCOME'
                          ? 'text-green-600 font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      Rp {item.price.toLocaleString('id-ID')}
                    </span>{' '}
                    / unit
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-6 w-6 p-0"
                      >
                        <Minus size={12} />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          setCustomPrice(
                            item.id,
                            parseInt(e.target.value) || 0
                          ) &&
                          updateQuantity(item.id, 0)
                        }
                        className="w-12 h-6 text-center text-xs p-0"
                        min="1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus size={12} />
                      </Button>
                    </div>

                    <div className="font-medium">
                      Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 text-xs hover:text-red-700"
                  >
                    <Trash2 size={12} className="inline mr-1" />
                    Hapus
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {cart.length > 0 && (
            <div className="border-t border-slate-200 p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Pemasukan</span>
                  <span className="text-green-700 font-medium">
                    Rp {totalIncome.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Pengeluaran</span>
                  <span className="text-red-700 font-medium">
                    Rp {totalExpense.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="flex-1"
                >
                  <X size={14} className="mr-1" />
                  Batal
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedUnit}
                  className="flex-1 bg-brand-600 hover:bg-brand-700"
                >
                  {isSubmitting ? '...' : <Save size={14} className="mr-1" />}
                  Simpan
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600">Catatan (opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambah catatan transaksi..."
                  className="w-full text-xs border border-slate-200 rounded p-2"
                  rows={2}
                />
              </div>

              {submitError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertDescription className="text-sm">
                    {submitError}
                  </AlertDescription>
                </Alert>
              )}
              {submitSuccess && (
                <Alert className="mt-2 bg-green-50 border-green-200">
                  <AlertDescription className="text-sm text-green-800">
                    {submitSuccess}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
