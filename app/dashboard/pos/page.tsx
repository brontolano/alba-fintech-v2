"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface CartItem {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unitPrice: number;
  currentStock: number;
  imageUrl?: string | null;
}

interface InventoryResponse {
  data: InventoryItem[];
  summary: {
    total: number;
    pages: number;
  };
}

import { usePageGuard } from "@/lib/use-page-guard";

export default function POSPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.unitIsRetail === true &&
      (u.role === "MANAGER" || u.role === "STAFF"),
    redirectTo: "/dashboard/transactions",
  });
  const router = useRouter();
  const { data: session } = useSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [products, setProducts] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<
    Array<{ value: string; label: string }>
  >([{ value: "all", label: "Semua" }]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [todaySales, setTodaySales] = useState<{
    count: number;
    income: number;
  } | null>(null);
  const [smartCardUid, setSmartCardUid] = useState("");
  const [payingSmart, setPayingSmart] = useState(false);
  const PAGE_SIZE = 100;
  const LOW_STOCK_THRESHOLD = 5;
  const isManager = session?.user?.role === "MANAGER";

  useEffect(() => {
    if (session?.user?.role !== "MANAGER") return;
    const fetchTodaySales = async () => {
      try {
        const res = await fetch(
          "/api/transactions?range=today&limit=1&type=INCOME",
        );
        if (!res.ok) throw new Error("Gagal memuat ringkasan");
        const data = await res.json();
        setTodaySales({
          count: data?.summary?.todayCount ?? 0,
          income: data?.summary?.todayIncome ?? 0,
        });
      } catch {
        setTodaySales({ count: 0, income: 0 });
      }
    };
    fetchTodaySales();
  }, [session?.user?.role]);

  const lowStockCount = products.filter(
    (p) => p.quantity <= LOW_STOCK_THRESHOLD,
  ).length;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch inventory items to use as POS products
        const res = await fetch(`/api/inventory?isActive=true&limit=${PAGE_SIZE}&page=1`);
        if (!res.ok) throw new Error("Gagal memuat produk");
        const data: InventoryResponse = await res.json();
        const inventoryItems = data.data ?? [];

        // Map inventory items to product format
        const mappedProducts: CartItem[] = inventoryItems.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: Number(item.unitPrice),
          quantity: item.currentStock ?? 0, // Handle null safely
          image: item.imageUrl || undefined,
          category: item.category ?? undefined,
        }));

        setProducts(mappedProducts);
        setPage(1);
        setTotalPages(data.summary?.pages ?? 1);

        // Build categories from inventory
        const uniqueCats = Array.from(
          new Set(
            inventoryItems
              .map((item) => item.category)
              .filter((c): c is string => c !== null),
          ),
        ).map((cat) => ({ value: cat, label: cat }));

        setCategories([{ value: "all", label: "Semua" }, ...uniqueCats]);
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat produk");
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const loadMoreProducts = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/inventory?isActive=true&limit=${PAGE_SIZE}&page=${nextPage}`,
      );
      if (!res.ok) throw new Error("Gagal memuat produk lainnya");
      const data: InventoryResponse = await res.json();
      const inventoryItems = data.data ?? [];

      const mappedProducts: CartItem[] = inventoryItems.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: Number(item.unitPrice),
        quantity: item.currentStock ?? 0,
        image: item.imageUrl || undefined,
        category: item.category ?? undefined,
      }));

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...mappedProducts.filter((p) => !seen.has(p.id))];
      });
      setPage(nextPage);
      setTotalPages(data.summary?.pages ?? nextPage);

      setCategories((prev) => {
        const existing = new Set(prev.map((c) => c.value));
        const fresh = Array.from(
          new Set(
            inventoryItems
              .map((item) => item.category)
              .filter((c): c is string => c !== null && !existing.has(c)),
          ),
        ).map((cat) => ({ value: cat, label: cat }));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat produk lainnya");
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: CartItem) => {
    const existingItem = cart.find((item) => item.id === product.id);
    const currentStock =
      products.find((p) => p.id === product.id)?.quantity ?? 0;
    const cartQty = existingItem?.quantity ?? 0;
    if (cartQty >= currentStock) {
      toast.error("Stok tidak mencukupi");
      return;
    }
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
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

  const handleScanBarcode = async () => {
    const term = barcode.trim().toLowerCase();
    if (!term) return;
    let product = products.find(
      (p) =>
        (p.sku && p.sku.toLowerCase() === term) || p.id.toLowerCase() === term,
    );

    if (!product) {
      // Produk mungkin belum ter-load (pagination). Cari langsung ke API.
      try {
        const res = await fetch(
          `/api/inventory?isActive=true&limit=1&search=${encodeURIComponent(term)}`,
        );
        if (!res.ok) throw new Error("Gagal mencari produk");
        const data: InventoryResponse = await res.json();
        const match = (data.data ?? []).find(
          (item) =>
            item.id.toLowerCase() === term ||
            (item.sku && item.sku.toLowerCase() === term),
        );
        if (match) {
          product = {
            id: match.id,
            name: match.name,
            sku: match.sku,
            price: Number(match.unitPrice),
            quantity: match.currentStock ?? 0,
            image: match.imageUrl || undefined,
            category: match.category ?? undefined,
          };
          setProducts((prev) =>
            prev.some((p) => p.id === product!.id)
              ? prev
              : [...prev, product!],
          );
        }
      } catch {
        product = undefined;
      }
    }

    if (product) {
      addToCart(product);
      setBarcode("");
    } else {
      toast.error("Produk dengan barcode/SKU tidak ditemukan");
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.id !== id));
    } else {
      // Validate against stock
      const product = products.find((p) => p.id === id);
      if (product && newQuantity > product.quantity) {
        toast.error("Stok tidak mencukupi");
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item,
        ),
      );
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setPaymentMethod("cash");
    setAmountPaid("");
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = subtotal;
  const amountPaidNum = Number(amountPaid) || 0;
  const change = amountPaidNum - total;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const handlePrintReceipt = () => {
    const receiptWindow = window.open("", "_blank");
    if (!receiptWindow) return;
    const itemsHtml = cart
      .map(
        (item) => `
      <tr>
        <td style="padding:4px 8px;">${item.name}</td>
        <td style="padding:4px 8px;text-align:right;">${item.quantity}x</td>
        <td style="padding:4px 8px;text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `,
      )
      .join("");
    const html = `
      <html>
        <head><title>Struk Penjualan</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 12px; }
            .total { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2 style="text-align:center;">ALBA Finance - Struk Penjualan</h2>
          <p style="text-align:center;font-size:12px;">${format(new Date(), "dd MMM yyyy HH:mm", { locale: id })}</p>
          <p style="font-size:12px;">Pelanggan: ${customerName || "Umum"}</p>
          <p style="font-size:12px;">Metode: ${paymentMethod === "cash" ? "Tunai" : paymentMethod === "smartcard" ? "Kartu Santri" : "Kartu"}</p>
          <table className="rtable w-full">
            <thead><tr><th align="left">Produk</th><th align="right">Qty</th><th align="right">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="text-align:right;font-size:12px;">Subtotal: ${formatCurrency(subtotal)}</p>
          <p style="text-align:right;font-size:12px;">Total: ${formatCurrency(total)}</p>
          ${paymentMethod === "cash" ? `<p style="text-align:right;font-size:12px;">Bayar: ${formatCurrency(amountPaidNum)}</p><p style="text-align:right;font-size:12px;">Kembalian: ${formatCurrency(change)}</p>` : ""}
          <p style="text-align:center;font-size:10px;margin-top:20px;">Terima kasih!</p>
        </body>
      </html>
    `;
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  };

  const handleSmartPay = async () => {
    if (!session) {
      toast.error("Anda harus login terlebih dahulu");
      router.push("/login");
      return;
    }
    if (cart.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    const uid = smartCardUid.trim();
    if (!uid) {
      toast.error("Tempel/scan kartu terlebih dahulu");
      return;
    }

    // Validasi stok di sisi klien sebelum kirim
    for (const cartItem of cart) {
      const product = products.find((p) => p.id === cartItem.id);
      if (product && cartItem.quantity > product.quantity) {
        toast.error(
          `Stok tidak mencukupi untuk ${product.name}. Tersedia: ${product.quantity}`,
        );
        return;
      }
      if (cartItem.quantity <= 0) {
        toast.error(`Quantity tidak valid untuk ${cartItem.name}`);
        return;
      }
    }

    setPayingSmart(true);
    try {
      const res = await fetch("/api/smartpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardUid: uid,
          unitId: session?.user?.unitId,
          items: cart.map((item) => ({
            itemId: item.id,
            quantity: item.quantity,
          })),
          description: `Penjualan ${cart.length} item${customerName ? ` untuk ${customerName}` : ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal memproses pembayaran kartu");
      }

      toast.success(
        `Pembayaran kartu berhasil! Sisa saldo ${formatCurrency(data?.data?.balanceAfter ?? 0)}`,
      );
      clearCart();
      setSmartCardUid("");
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses pembayaran kartu");
    } finally {
      setPayingSmart(false);
    }
  };

  const handleSendWhatsApp = () => {
    const itemsText = cart
      .map(
        (item) =>
          `${item.name} x${item.quantity} = ${formatCurrency(item.price * item.quantity)}`,
      )
      .join("\n");
    const message = encodeURIComponent(
      `🧾 STRUK ALBA FINANCE\n\n${itemsText}\n\n` +
        `Subtotal: ${formatCurrency(subtotal)}\n` +
        `Total: ${formatCurrency(total)}\n` +
        `${paymentMethod === "cash" ? `Bayar: ${formatCurrency(amountPaidNum)}\nKembalian: ${formatCurrency(change)}\n` : ""}` +
        `Tanggal: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: id })}\n\nTerima kasih!`,
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handleCheckout = async () => {
    if (!session) {
      toast.error("Anda harus login terlebih dahulu");
      router.push("/login");
      return;
    }

    if (cart.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    // Validasi uang bayar untuk transaksi tunai
    if (paymentMethod === "cash") {
      if (amountPaidNum <= 0) {
        toast.error("Isi jumlah uang bayar terlebih dahulu");
        return;
      }
      if (amountPaidNum < total) {
        toast.error(
          `Uang bayar kurang. Kurang ${formatCurrency(total - amountPaidNum)}`,
        );
        return;
      }
    }

    if (paymentMethod === "smartcard") {
      toast.error("Pembayaran kartu santri lewat tombol Bayar Kartu");
      return;
    }

    // Validate stock on client-side before submitting
    for (const cartItem of cart) {
      const product = products.find((p) => p.id === cartItem.id);
      if (product && cartItem.quantity > product.quantity) {
        toast.error(
          `Stok tidak mencukupi untuk ${product.name}. Tersedia: ${product.quantity}`,
        );
        return;
      }
      if (cartItem.quantity <= 0) {
        toast.error(`Quantity tidak valid untuk ${cartItem.name}`);
        return;
      }
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INCOME",
          amount: total,
          unitId: session?.user?.unitId,
          description: `Penjualan ${cart.length} item${customerName ? ` untuk ${customerName}` : ""}`,
          paymentMethod,
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
        const err = await res.json();
        throw new Error(err.error || "Gagal memproses transaksi");
      }

      toast.success("Transaksi berhasil disimpan!");
      clearCart();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses transaksi");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Operasional
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Point of Sale (POS)
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Penjualan - Unit Toko/Retail
        </p>
      </div>

      {isManager && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Penjualan Hari Ini
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {todaySales
                ? formatCurrency(todaySales.income)
                : formatCurrency(0)}
            </p>
          </div>
          <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Transaksi Hari Ini
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {todaySales ? todaySales.count : 0} transaksi
            </p>
          </div>
          <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Stok Menipis
            </p>
            <p
              className={`mt-1 text-xl font-bold ${lowStockCount > 0 ? "text-amber-600" : "text-foreground"}`}
            >
              {products.length === 0 ? "—" : `${lowStockCount} produk`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Scan barcode / SKU..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScanBarcode()}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.quantity === 0}
                className="rounded-[22px] border border-border bg-card p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Package size={24} className="text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {product.name}
                </h3>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-emerald-600">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Stok: {product.quantity}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {page < totalPages && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMoreProducts}
                disabled={loadingMore}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Package size={16} />
                <span>{loadingMore ? "Memuat..." : "Muat Lebih Banyak"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-[22px] border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <input
              type="text"
              placeholder="Nama pelanggan (opsional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="rounded-[22px] border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="mb-2 text-sm font-medium text-foreground">
              Metode Pembayaran
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                  paymentMethod === "cash"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                <Banknote size={16} />
                <span>Tunai</span>
              </button>
              <button
                onClick={() => setPaymentMethod("smartcard")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                  paymentMethod === "smartcard"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                <CreditCard size={16} />
                <span>Kartu Santri</span>
              </button>
            </div>
          </div>

          {paymentMethod === "smartcard" && (
            <div className="rounded-[22px] border border-primary/20 bg-primary/5 p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <ScanLine size={16} className="text-primary" />
                UID Kartu Santri
              </label>
              <input
                type="text"
                placeholder="Tempel / scan kartu, masukkan UID..."
                value={smartCardUid}
                onChange={(e) => setSmartCardUid(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSmartPay()}
                autoFocus
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Saldo akan didebit otomatis dari tabungan santri.
              </p>
            </div>
          )}

          <div className="rounded-[22px] border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <ShoppingCart size={18} />
              Keranjang ({cart.reduce(
                (sum, item) => sum + item.quantity,
                0,
              )}{" "}
              item)
            </h2>

            {cart.length === 0 ? (
              <div className="py-6 text-center">
                <ShoppingCart
                  size={32}
                  className="mx-auto mb-2 text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">
                  Keranjang kosong
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Klik produk untuk menambahkan ke keranjang
                </p>
              </div>
            ) : (
              <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground transition hover:bg-muted/80"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground transition hover:bg-muted/80"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                      >
<Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {paymentMethod === "cash" && (
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-muted-foreground">
                    Uang Bayar
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="0"
                  />
                </div>
              )}
              {paymentMethod === "cash" && amountPaidNum > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Kembalian
                  </span>
                  <span
                    className={`text-sm font-bold ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold text-foreground">
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
                onClick={
                  paymentMethod === "smartcard"
                    ? handleSmartPay
                    : handleCheckout
                }
                disabled={
                  cart.length === 0 ||
                  (paymentMethod === "smartcard" && payingSmart)
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentMethod === "smartcard" ? (
                  <>
                    <CreditCard size={18} />
                    <span>{payingSmart ? "Memproses..." : "Bayar dengan Kartu"}</span>
                  </>
                ) : (
                  <>
                    <Receipt size={18} />
                    <span>Bayar</span>
                  </>
                )}
              </button>
              {cart.length > 0 && (
                <>
                  <button
                    onClick={handlePrintReceipt}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    <Receipt size={16} />
                    <span>Cetak Struk</span>
                  </button>
                  <button
                    onClick={handleSendWhatsApp}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <span>WhatsApp</span>
                  </button>
                </>
              )}
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
