// app/retail/[unitId]/RetailPosClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../components/santri/Button';
import { Badge } from '../../../components/santri/Badge';
import { Modal } from '../../../components/santri/Modal';
import { Input } from '../../../components/santri/Input';
import { Select } from '../../../components/santri/Select';
import { RetailUnit, RetailProduct, RetailTransaction } from '../../../types/santri';

interface CartItem {
  product: RetailProduct;
  quantity: number;
}

export function RetailPosClient() {
  const params = useParams();
  const router = useRouter();
  const { unitId } = params;
  
  const [retailUnit, setRetailUnit] = useState<RetailUnit | null>(null);
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<RetailProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TABUNGAN' | 'CARD' | 'SPLIT'>('CASH');
  const [santriId, setSantriId] = useState('');
  const [santriNumber, setSantriNumber] = useState('');
  const [santriInfo, setSantriInfo] = useState<{ id: string; studentNumber: string; name: string; saldo: number; minSaldo: number } | null>(null);
  const [santriLoading, setSantriLoading] = useState(false);
  const [santriError, setSantriError] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, tabungan: 0, card: 0 });
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [heldCarts, setHeldCarts] = useState<{ id: string; name: string; cart: CartItem[]; total: number; createdAt: string }[]>([]);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdName, setHoldName] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  const fetchRetailUnit = useCallback(async () => {
    try {
      const res = await fetch(`/api/retail-units?unitId=${unitId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat unit retail');
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        setRetailUnit(data.data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [unitId]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`/api/retail-products?retailUnitId=${unitId}&isActive=true`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat produk');
      const data = await res.json();
      setProducts(data.data);
      setFilteredProducts(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchRetailUnit();
    fetchProducts();
  }, [fetchRetailUnit, fetchProducts]);

  // Filter products
  useEffect(() => {
    let result = products;
    if (search) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.code.toLowerCase().includes(search.toLowerCase())
      );
    }
    // Category filter could be added if products have category field
    setFilteredProducts(result);
  }, [products, search, categoryFilter]);

  // Lookup santri by NIS
  const lookupSantri = async () => {
    if (!santriNumber.trim()) return;
    setSantriLoading(true);
    setSantriError(null);
    try {
      const res = await fetch(`/api/santris?search=${encodeURIComponent(santriNumber.trim())}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal mencari santri');
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const santri = data.data[0];
        setSantriId(santri.id);
        // Fetch tabungan info
        const tabRes = await fetch(`/api/tabungans?santriId=${santri.id}`, { cache: 'no-store' });
        if (tabRes.ok) {
          const tabData = await tabRes.json();
          if (tabData.data && tabData.data.length > 0) {
            const tab = tabData.data[0];
            setSantriInfo({
              id: santri.id,
              studentNumber: santri.studentNumber,
              name: santri.name,
              saldo: tab.saldo,
              minSaldo: tab.minSaldo,
            });
          } else {
            setSantriError('Santri tidak memiliki rekening tabungan');
          }
        }
      } else {
        setSantriError('Santri tidak ditemukan');
      }
    } catch (err: any) {
      setSantriError(err.message);
    } finally {
      setSantriLoading(false);
    }
  };

  // Cart operations
  const addToCart = (product: RetailProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock) return;
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const canPayWithTabungan = () => {
    return paymentMethod === 'TABUNGAN' && santriInfo && santriInfo.saldo >= getSubtotal();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'TABUNGAN' && !santriId) {
      setCheckoutError('Santri wajib dipilih untuk pembayaran TABUNGAN');
      return;
    }
    if (paymentMethod === 'SPLIT') {
      const total = getSubtotal();
      if (splitPayment.cash + splitPayment.tabungan + splitPayment.card !== total) {
        setCheckoutError(`Total split payment (Rp ${splitPayment.cash + splitPayment.tabungan + splitPayment.card}) harus sama dengan total belanja (Rp ${total})`);
        return;
      }
      if (splitPayment.tabungan > 0 && !santriId) {
        setCheckoutError('Santri wajib dipilih untuk pembayaran TABUNGAN');
        return;
      }
      if (splitPayment.tabungan > 0 && santriInfo && splitPayment.tabungan > santriInfo.saldo) {
        setCheckoutError('Saldo tabungan tidak mencukupi untuk bagian TABUNGAN');
        return;
      }
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const res = await fetch('/api/retail-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailUnitId: unitId,
          santriId: santriId || undefined,
          items,
          paymentMethod: paymentMethod === 'SPLIT' ? 'SPLIT' : paymentMethod,
          keterangan,
          splitPayment: paymentMethod === 'SPLIT' ? splitPayment : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memproses transaksi');
      }

      setCheckoutModalOpen(false);
      setCart([]);
      setSantriId('');
      setSantriNumber('');
      setSantriInfo(null);
      setKeterangan('');
      setPaymentMethod('CASH');
      setSplitPayment({ cash: 0, tabungan: 0, card: 0 });
      fetchProducts(); // Refresh stock
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Hold/Resume cart functions
  const holdCart = () => {
    if (cart.length === 0) return;
    if (!holdName.trim()) {
      setShowHoldModal(true);
      return;
    }
    const newHeldCart = {
      id: `hold-${Date.now()}`,
      name: holdName,
      cart: [...cart],
      total: getSubtotal(),
      createdAt: new Date().toISOString(),
    };
    setHeldCarts(prev => [...prev, newHeldCart]);
    setCart([]);
    setSantriId('');
    setSantriNumber('');
    setSantriInfo(null);
    setKeterangan('');
    setPaymentMethod('CASH');
    setHoldName('');
  };

  const resumeHeldCart = (heldCart: typeof heldCarts[0]) => {
    setCart(heldCart.cart);
    setHeldCarts(prev => prev.filter(h => h.id !== heldCart.id));
  };

  const deleteHeldCart = (id: string) => {
    setHeldCarts(prev => prev.filter(h => h.id !== id));
  };

  // Barcode scan handler
  const handleBarcodeScan = (code: string) => {
    const product = products.find(p => p.code === code);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      setError(`Produk dengan kode ${code} tidak ditemukan`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // Role gating (placeholder)
  const currentRole = 'MANAGER KOPERASI'; // Would come from auth context

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error}
        <button className="ml-4 underline" onClick={() => window.location.reload()}>Coba lagi</button>
      </div>
    );
  }

  if (!retailUnit) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unit retail tidak ditemukan.</p>
        <Link href="/dashboard" className="mt-4 inline-block btn btn-primary">Kembali</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">POS {retailUnit.name}</h1>
          <p className="text-sm text-gray-500">Kode: {retailUnit.code} | Tipe: {retailUnit.type}</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-wrap gap-3 bg-white p-4 rounded-lg border border-gray-200">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk (nama/kode)..."
              className="flex-1 min-w-[200px]"
            />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'Semua Kategori' },
                { value: 'MAKANAN', label: 'Makanan' },
                { value: 'MINUMAN', label: 'Minuman' },
                { value: 'ATK', label: 'ATK' },
                { value: 'LAINNYA', label: 'Lainnya' },
              ]}
              className="w-48"
            />
          </div>

          {/* Product Grid */}
          <div className="bg-white rounded-lg border border-gray-200">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                Tidak ada produk tersedia
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className={`pos-product-btn p-3 text-left border rounded-lg transition-all ${
                      product.stock <= 0 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white hover:bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.code}</div>
                    <div className="font-semibold text-green-700 mt-1">{formatRupiah(product.price)}</div>
                    <div className="text-xs text-gray-400 flex justify-between">
                      <span>Stok: {product.stock}</span>
                      {product.stock <= product.minStock && product.stock > 0 && (
                        <span className="text-orange-600">Min!</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="space-y-4">
          {/* Cart */}
          <div className="bg-white rounded-lg border border-gray-200 sticky top-24">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Keranjang ({cart.length} item)</h2>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.product.name}</div>
                        <div className="text-xs text-gray-500">{formatRupiah(item.product.price)} x {item.quantity}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </Button>
                        <span className="font-mono text-sm w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                      <div className="font-semibold text-right w-24">
                        {formatRupiah(item.product.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
                          <div className="p-4 border-t border-gray-200 space-y-3">
                            <div className="flex justify-between text-lg font-semibold">
                              <span>Total</span>
                              <span>{formatRupiah(getSubtotal())}</span>
                            </div>
               
                            {/* Barcode Scanner Input */}
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && barcodeInput.trim()) { handleBarcodeScan(barcodeInput.trim()); } }}
                                placeholder="Scan barcode / ketik kode produk (Enter untuk tambah)"
                                className="flex-1"
                              />
                              <Button variant="outline" onClick={() => handleBarcodeScan(barcodeInput)} disabled={!barcodeInput.trim()}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                              </Button>
                            </div>

                            {/* Hold/Resume Cart */}
                            {(heldCarts.length > 0 || cart.length > 0) && (
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setShowHoldModal(true)} disabled={cart.length === 0}>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                  Hold Cart
                                </Button>
                                {heldCarts.length > 0 && (
                                  <Button variant="secondary" onClick={() => setShowHoldModal(true)}>
                                    Resume ({heldCarts.length})
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Payment Method */}
                            <div>
                              <label className="block text-sm font-medium mb-2">Metode Pembayaran</label>
                              <div className="grid grid-cols-4 gap-2">
                                {(['CASH', 'TABUNGAN', 'CARD', 'SPLIT'] as const).map(method => (
                                  <button
                                    key={method}
                                    onClick={() => { setPaymentMethod(method); setShowSplitModal(method === 'SPLIT'); }}
                                    className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-all ${
                                      paymentMethod === method
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {method}
                                  </button>
                                ))}
                              </div>
                            </div>

                {/* Santri Lookup for Tabungan */}
                {paymentMethod === 'TABUNGAN' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={santriNumber}
                        onChange={(e) => setSantriNumber(e.target.value)}
                        placeholder="NIS / Nama santri"
                        className="flex-1"
                      />
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={lookupSantri}
                        disabled={santriLoading}
                      >
                        {santriLoading ? 'Cari...' : 'Cari'}
                      </Button>
                    </div>
                    {santriError && (
                      <p className="text-red-600 text-sm">{santriError}</p>
                    )}
                    {santriInfo && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="font-medium">{santriInfo.name} ({santriInfo.studentNumber})</div>
                        <div className="text-sm text-gray-600 flex justify-between">
                          <span>Saldo: {formatRupiah(santriInfo.saldo)}</span>
                          <span>Min: {formatRupiah(santriInfo.minSaldo)}</span>
                        </div>
                        {santriInfo.saldo < getSubtotal() && (
                          <p className="text-red-600 text-xs mt-1">Saldo tidak mencukupi!</p>
                        )}
                        {santriInfo.saldo - getSubtotal() < santriInfo.minSaldo && santriInfo.saldo >= getSubtotal() && (
                          <p className="text-orange-600 text-xs mt-1">Saldo akan di bawah minimum!</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Keterangan */}
                <div>
                  <label className="block text-sm font-medium mb-1">Keterangan (opsional)</label>
                  <Input
                    type="text"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Catatan transaksi..."
                  />
                </div>

                {/* Checkout Button */}
                <Button
                  variant="success"
                  size="lg"
                  className="w-full"
                  onClick={() => setCheckoutModalOpen(true)}
                  disabled={cart.length === 0 || (paymentMethod === 'TABUNGAN' && (!santriId || !canPayWithTabungan()))}
                >
                  Bayar {formatRupiah(getSubtotal())}
                </Button>

                {cart.length > 0 && (
                  <Button variant="outline" size="sm" className="w-full" onClick={clearCart}>
                    Kosongkan Keranjang
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="Konfirmasi Pembayaran"
        description={`Total: ${formatRupiah(getSubtotal())} | Metode: ${paymentMethod}`}
        actionLabel={checkoutLoading ? 'Memproses...' : 'Ya, Bayar Sekarang'}
        onAction={handleCheckout}
        isLoading={checkoutLoading}
        variant="primary"
        customContent={
          <div className="space-y-3">
            {checkoutError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
                {checkoutError}
              </div>
            )}
            <div className="text-sm">
              <p>Items: {cart.map(i => `${i.product.name} x${i.quantity}`).join(', ')}</p>
              <p>Metode: {paymentMethod}</p>
              {paymentMethod === 'TABUNGAN' && santriInfo && (
                <p>Santri: {santriInfo.name} ({santriInfo.studentNumber})</p>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}