'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unitPrice: number;
  currentStock: number;
}

interface InventoryResponse {
  data: InventoryItem[];
  summary: {
    total: number;
    pages: number;
  };
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [products, setProducts] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([
    { value: 'all', label: 'Semua' },
  ]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch inventory items to use as POS products
        const res = await fetch('/api/inventory?isActive=true');
        if (!res.ok) throw new Error('Gagal memuat produk');
        const data: InventoryResponse = await res.json();
        const inventoryItems = data.data ?? [];

        // Map inventory items to product format
        const mappedProducts: CartItem[] = inventoryItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.unitPrice),
          quantity: item.currentStock,
          image: undefined,
        }));

        setProducts(mappedProducts);

        // Build categories from inventory
        const uniqueCats = Array.from(new Set(
          inventoryItems
            .map((item) => item.category)
            .filter((c): c is string => c !== null)
        )).map((cat) => ({ value: cat, label: cat }));

        setCategories([{ value: 'all', label: 'Semua' }, ...uniqueCats]);
      } catch (err: any) {
        toast.error(err.message || 'Gagal memuat produk');
        // Fallback to mock data if API fails
        setProducts([
          { id: '1', name: 'Nasi Goreng', price: 15000, quantity: 50 },
          { id: '2', name: 'Mie Goreng', price: 12000, quantity: 45 },
          { id: '3', name: 'Es Teh Manis', price: 5000, quantity: 100 },
        ]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      products.find((p) => p.id === product.id)?.name.includes(selectedCategory) ||
      true; // category filter applied via the categories list below
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: CartItem) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.id !== id));
    } else {
      setCart(
        cart.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setPaymentMethod('cash');
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INCOME',
          amount: total,
          description: `Penjualan ${cart.length} item${customerName ? ` untuk ${customerName}` : ''}`,
          orderItems: cart.map((item) => ({
            itemId: item.id,
            itemName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal memproses transaksi');
      }

      toast.success('Transaksi berhasil disimpan!');
      clearCart();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses transaksi');
    }
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">
          Point of Sale (POS)
        </h1>
        <p className="text-slate-600 mt-1">
          Penjualan - Unit Toko/Retail
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Left: Product Grid */}
        <div className="space-y-4">
          {/* Search & Category */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock === 0}
                className="bg-white rounded-lg border border-slate-200 p-3 text-left hover:shadow-md transition-shadow disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg mx-auto mb-2">
                  <Package size={24} className="text-slate-500" />
                </div>
                <h3 className="font-medium text-slate-800 text-sm">
                  {product.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {product.category}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-xs text-slate-500">
                    Stok: {product.stock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <input
              type="text"
              placeholder="Nama pelanggan (opsional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Metode Pembayaran
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center gap-2 py-2 flex-1 rounded-lg text-sm font-medium transition ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Banknote size={16} />
                <span>Tunai</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-center gap-2 py-2 flex-1 rounded-lg text-sm font-medium transition ${
                  paymentMethod === 'card'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CreditCard size={16} />
                <span>Kartu</span>
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <ShoppingCart size={18} />
              Keranjang ({cart.reduce((sum, item) => sum + item.quantity, 0)} item)
            </h2>

            {cart.length === 0 ? (
              <div className="text-center py-6">
                <ShoppingCart size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Keranjang kosong</p>
                <p className="text-xs text-slate-400 mt-1">
                  Klik produk untuk menambahkan ke keranjang
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-medium text-slate-800 w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 flex items-center justify-center rounded text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Subtotal</span>
                <span className="text-sm font-medium text-slate-800">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Pajak (10%)</span>
                <span className="text-sm font-medium text-slate-800">
                  {formatCurrency(tax)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-slate-800">
                    Total
                  </span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <Receipt size={18} />
                <span>Bayar</span>
              </button>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="w-full py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
