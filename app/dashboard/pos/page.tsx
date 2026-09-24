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
  Clock,
  Camera,
  Printer,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
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

interface ReceiptData {
  items: { name: string; qty: number; price: number }[];
  total: number;
  paid: number;
  change: number;
  method: "cash" | "smartcard";
  cardBalanceAfter?: number;
  date: string;
  txId?: string;
}

import { usePageGuard } from "@/lib/use-page-guard";

/**
 * Hook placeholder Computer Vision / Image Retrieval (CATATAN).
 * Kontrak: scanImage(file) -> [{ sku, qty }].
 * Hari ini melempar NOT_IMPLEMENTED; kelak diisi model AI tanpa
 * mengubah alur POS (cukup ganti isi hook ini).
 */
function useProductVision() {
  const [busy, setBusy] = useState(false);
  const scanImage = async (_file: File): Promise<{ sku: string; qty: number }[]> => {
    setBusy(true);
    try {
      throw new Error("NOT_IMPLEMENTED: pengenalan kamera segera hadir");
    } finally {
      setBusy(false);
    }
  };
  return { scanImage, busy };
}

const STEPS = ["Katalog", "Bayar", "Struk", "Selesai"] as const;

export default function POSPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.unitIsRetail === true &&
      (u.role === "MANAGER" || u.role === "STAFF"),
    redirectTo: "/dashboard/transactions",
  });
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
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
  const [payingCash, setPayingCash] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const { scanImage, busy: visionBusy } = useProductVision();
  const PAGE_SIZE = 100;
  const LOW_STOCK_THRESHOLD = 5;
  const isManager = session?.user?.role === "MANAGER";
  // R2: kasir retail wajib sesi POS terbuka miliknya sebelum checkout.
  const needPosSession =
    (session?.user?.role === "STAFF" ||
      session?.user?.role === "MANAGER") &&
    (session?.user as any)?.unitIsRetail === true;
  const [posSessionId, setPosSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!needPosSession) return;
    fetch("/api/retail/pos-session")
      .then((r) => r.json())
      .then((b) => setPosSessionId(b?.data?.open?.id ?? null))
      .catch(() => setPosSessionId(null));
  }, [needPosSession, (session?.user as any)?.id]);

  const requirePosSession = () => {
    if (needPosSession && !posSessionId) {
      toast.error("Buka sesi POS dulu di halaman Shift");
      router.push("/dashboard/retail/shift");
      return false;
    }
    return true;
  };

  const refreshPosSession = () =>
    fetch("/api/retail/pos-session")
      .then((r) => r.json())
      .then((b) => setPosSessionId(b?.data?.open?.id ?? null))
      .catch(() => {});

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
        if (!match) {
          toast.error("Produk dengan barcode/SKU tidak ditemukan");
          return;
        }
        product = {
          id: match.id,
          name: match.name,
          sku: match.sku,
          price: Number(match.unitPrice),
          quantity: match.currentStock ?? 0,
          image: match.imageUrl || undefined,
          category: match.category ?? undefined,
        };
      } catch (err: any) {
        toast.error(err.message || "Gagal mencari produk");
        return;
      }
    }
    addToCart(product);
    setBarcode("");
  };

  // Placeholder Computer Vision: input kamera → (nanti) daftar SKU.
  const handleVisionScan = async (file: File) => {
    try {
      const found = await scanImage(file);
      if (found.length === 0) toast.info("Tidak ada produk terdeteksi");
      // TODO(AI): petakan sku → addToCart massal.
    } catch (err: any) {
      toast.info(err.message || "Pengenalan kamera segera hadir");
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

  const resetToStep1 = () => {
    clearCart();
    setSmartCardUid("");
    setReceipt(null);
    setStep(1);
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

  const snapshotItems = () =>
    cart.map((item) => ({ name: item.name, qty: item.quantity, price: item.price }));

  const handleSmartPay = async () => {
    if (!session) {
      toast.error("Anda harus login terlebih dahulu");
      router.push("/login");
      return;
    }
    if (!requirePosSession()) return;

    const uid = smartCardUid.trim().toUpperCase();
    if (!uid) {
      toast.error("Masukkan UID kartu santri");
      return;
    }
    if (cart.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    // Validasi stok client-side sebelum submit.
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
          posSessionId: posSessionId ?? undefined,
          items: cart.map((item) => ({
            itemId: item.id,
            quantity: item.quantity,
          })),
          description: `Penjualan ${cart.length} item${customerName ? ` untuk ${customerName}` : ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (String(data?.error || "").includes("POS_BELUM_DIBUKA")) {
          setPosSessionId(null);
          await refreshPosSession();
          toast.error("Sesi POS tidak valid — buka ulang di halaman Shift");
          router.push("/dashboard/retail/shift");
          return;
        }
        // Edge: saldo/limit/stok — cart UTUH, tetap di Step 2.
        throw new Error(data?.error || "Gagal memproses pembayaran kartu");
      }

      toast.success(
        `Pembayaran kartu berhasil! Sisa saldo ${formatCurrency(data?.data?.balanceAfter ?? 0)}`,
      );
      setReceipt({
        items: snapshotItems(),
        total,
        paid: total,
        change: 0,
        method: "smartcard",
        cardBalanceAfter: data?.data?.balanceAfter ?? undefined,
        date: format(new Date(), "dd MMM yyyy HH:mm", { locale: id }),
        txId: data?.data?.transactionId,
      });
      clearCart();
      setSmartCardUid("");
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses pembayaran kartu");
    } finally {
      setPayingSmart(false);
    }
  };

  const handleSendWhatsApp = (r?: ReceiptData | null) => {
    const rc = r ?? {
      items: snapshotItems(),
      total,
      paid: amountPaidNum,
      change,
      method: paymentMethod as "cash" | "smartcard",
      date: format(new Date(), "dd MMM yyyy HH:mm", { locale: id }),
    };
    const itemsText = rc.items
      .map((item) => `${item.name} x${item.qty} = ${formatCurrency(item.price * item.qty)}`)
      .join("\n");
    const message = encodeURIComponent(
      `🧾 STRUK ALBA FINANCE\n\n${itemsText}\n\n` +
        `Subtotal: ${formatCurrency(rc.total)}\n` +
        `Total: ${formatCurrency(rc.total)}\n` +
        `${rc.method === "cash" ? `Bayar: ${formatCurrency(rc.paid)}\nKembalian: ${formatCurrency(rc.change)}\n` : ""}` +
        `Tanggal: ${rc.date}\n\nTerima kasih!`,
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handlePrintReceipt = (r?: ReceiptData | null) => {
    const rc = r ?? {
      items: snapshotItems(),
      total,
      paid: amountPaidNum,
      change,
      method: paymentMethod as "cash" | "smartcard",
      date: format(new Date(), "dd MMM yyyy HH:mm", { locale: id }),
    };
    const receiptWindow = window.open("", "_blank");
    if (!receiptWindow) return;
    const itemsHtml = rc.items
      .map(
        (item) => `
      <tr>
        <td style="padding:4px 8px;">${item.name}</td>
        <td style="padding:4px 8px;text-align:right;">${item.qty}x</td>
        <td style="padding:4px 8px;text-align:right;">${formatCurrency(item.price * item.qty)}</td>
      </tr>
    `,
      )
      .join("");
    const html = `
      <html>
        <head><title>Struk Penjualan</title>
          <style>
            /* Thermal 58/80mm: cetak ramping, font monospace */
            @media print { @page { size: 80mm auto; margin: 2mm; } }
            body { font-family: monospace; padding: 4px; width: 72mm; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 12px; }
            .total { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2 style="text-align:center;">ALBA Finance - Struk Penjualan</h2>
          <p style="text-align:center;font-size:12px;">${rc.date}</p>
          <p style="font-size:12px;">Pelanggan: ${customerName || "Umum"}</p>
          <p style="font-size:12px;">Metode: ${rc.method === "cash" ? "Tunai" : "Kartu Santri"}</p>
          <table className="rtable w-full">
            <thead><tr><th align="left">Produk</th><th align="right">Qty</th><th align="right">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="text-align:right;font-size:12px;">Subtotal: ${formatCurrency(rc.total)}</p>
          <p style="text-align:right;font-size:12px;">Total: ${formatCurrency(rc.total)}</p>
          ${rc.method === "cash" ? `<p style="text-align:right;font-size:12px;">Bayar: ${formatCurrency(rc.paid)}</p><p style="text-align:right;font-size:12px;">Kembalian: ${formatCurrency(rc.change)}</p>` : ""}
          <p style="text-align:center;font-size:10px;margin-top:20px;">Terima kasih!</p>
        </body>
      </html>
    `;
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
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

    if (!requirePosSession()) return;

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

    setPayingCash(true);
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
          posSessionId: posSessionId ?? undefined,
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
        if (String(err?.error || "").includes("POS_BELUM_DIBUKA")) {
          setPosSessionId(null);
          await refreshPosSession();
          toast.error("Sesi POS tidak valid — buka ulang di halaman Shift");
          router.push("/dashboard/retail/shift");
          return;
        }
        throw new Error(err.error || "Gagal memproses transaksi");
      }

      toast.success("Transaksi berhasil disimpan!");
      setReceipt({
        items: snapshotItems(),
        total,
        paid: amountPaidNum,
        change,
        method: "cash",
        date: format(new Date(), "dd MMM yyyy HH:mm", { locale: id }),
      });
      clearCart();
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses transaksi");
    } finally {
      setPayingCash(false);
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4">
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
        <button
          onClick={() => router.push("/dashboard/retail/shift")}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Clock size={16} />
          Shift Kasir
        </button>
      </div>

      {needPosSession && !posSessionId && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            Sesi POS belum dibuka — transaksi ditahan sampai kasir dibuka.
          </p>
          <button
            onClick={() => router.push("/dashboard/retail/shift")}
            className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Buka di Shift
          </button>
        </div>
      )}

      {/* Stepper */}
      <ol className="grid grid-cols-4 gap-1 text-center text-[11px] font-semibold sm:text-xs">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const done = step > n;
          const active = step === n;
          return (
            <li
              key={label}
              className={`rounded-lg border px-1 py-1.5 ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : done
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                    : "bg-card text-muted-foreground"
              }`}
            >
              {i + 1}. {label}
            </li>
          );
        })}
      </ol>

      {isManager && step === 1 && (
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

      {/* STEP 1 — Katalog */}
      {step === 1 && (
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
                <ScanLine
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
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted">
                <Camera size={16} />
                <span>{visionBusy ? "Memindai…" : "Scan Kamera"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleVisionScan(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pengenalan objek kamera (AI) segera hadir — saat ini gunakan
              pencarian, scan barcode/SKU, atau grid produk.
            </p>
          </div>

          {loadingProducts ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat produk…
            </p>
          ) : (
            <>
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
            </>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={cartCount === 0}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            <span>Lanjut ke Pembayaran ({cartCount} item)</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 2 — Cart & bayar */}
      {step === 2 && (
        <div className="mx-auto max-w-2xl space-y-5">
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={15} /> Kembali ke katalog
          </button>

          <div className="rounded-[22px] border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <input
              type="text"
              placeholder="Nama pelanggan (opsional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <ShoppingCart size={18} />
              Keranjang ({cartCount} item)
            </h2>
            {cart.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Keranjang kosong — kembali ke katalog.
              </p>
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
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Saldo diverifikasi real-time dari tabungan santri. Bila saldo
                kurang / limit harian tercapai, pembayaran ditolak dan
                keranjang tetap utuh.
              </p>
            </div>
          )}

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

            <div className="mt-4">
              <button
                onClick={
                  paymentMethod === "smartcard"
                    ? handleSmartPay
                    : handleCheckout
                }
                disabled={
                  cart.length === 0 ||
                  (paymentMethod === "smartcard" && payingSmart) ||
                  (paymentMethod === "cash" && payingCash)
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
                    <span>{payingCash ? "Memproses..." : "Bayar"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 — Struk */}
      {step === 3 && receipt && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="rounded-[22px] border border-border bg-card p-4 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
            <h2 className="mt-2 text-lg font-bold">Pembayaran Berhasil</h2>
            <p className="text-sm text-muted-foreground">
              Total {formatCurrency(receipt.total)}
              {receipt.method === "cash" &&
                ` · Kembalian ${formatCurrency(receipt.change)}`}
              {receipt.method === "smartcard" &&
                receipt.cardBalanceAfter !== undefined &&
                ` · Sisa saldo ${formatCurrency(receipt.cardBalanceAfter)}`}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => handlePrintReceipt(receipt)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <Printer size={16} />
              <span>Cetak Struk (Thermal 58/80mm)</span>
            </button>
            <button
              onClick={() => handleSendWhatsApp(receipt)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <span>Kirim via WhatsApp</span>
            </button>
          </div>
          <button
            onClick={() => setStep(4)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <span>Selesai</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 4 — Selesai */}
      {step === 4 && receipt && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="mb-3 text-center text-base font-bold">
              Preview Struk
            </h2>
            <div className="mx-auto max-w-xs space-y-1 font-mono text-xs">
              <p className="text-center font-bold">ALBA Finance</p>
              <p className="text-center">{receipt.date}</p>
              <p>Pelanggan: {customerName || "Umum"}</p>
              <p>
                Metode: {receipt.method === "cash" ? "Tunai" : "Kartu Santri"}
              </p>
              <hr />
              {receipt.items.map((it, i) => (
                <p key={i} className="flex justify-between">
                  <span>
                    {it.name} x{it.qty}
                  </span>
                  <span>{formatCurrency(it.price * it.qty)}</span>
                </p>
              ))}
              <hr />
              <p className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(receipt.total)}</span>
              </p>
              {receipt.method === "cash" && (
                <>
                  <p className="flex justify-between">
                    <span>Bayar</span>
                    <span>{formatCurrency(receipt.paid)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Kembalian</span>
                    <span>{formatCurrency(receipt.change)}</span>
                  </p>
                </>
              )}
              <p className="pt-2 text-center">Terima kasih!</p>
            </div>
          </div>
          <button
            onClick={resetToStep1}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <ShoppingCart size={18} />
            <span>Kembali ke Kasir (Transaksi Baru)</span>
          </button>
        </div>
      )}
    </div>
  );
}
