"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  FinzoList,
  FinzoListRow,
  StatCard,
  finzoInputClass,
  finzoSelectClass,
} from "@/components/ui/finzo";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  imageUrl: string | null;
  unitId: string | null;
  unitName?: string;
  unit: { id: string; name: string } | null;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  purchasePrice: number;
  isActive: boolean;
  orderItems: Array<{ id: string; quantity: number; totalPrice: number }>;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  id: string;
  name: string;
}

interface InventoryResponse {
  data: InventoryItem[];
  summary: {
    total: number;
    pages: number;
  };
}

interface UnitsResponse {
  data: Unit[];
}

import { usePageGuard } from "@/lib/use-page-guard";

export default function InventoryPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      (u?.unitIsRetail === true &&
        (u.role === "MANAGER" || u.role === "STAFF")),
  });
  const { data: session } = useSession();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const [filters, setFilters] = useState({
    search: "",
    unitId: "",
    category: "",
    stockStatus: "all",
  });

  // Set default unit filter for MANAGER/STAFF
  useEffect(() => {
    if (session?.user?.role === "MANAGER" || session?.user?.role === "STAFF") {
      if (session?.user?.unitId) {
        setFilters((prev) => ({ ...prev, unitId: session.user.unitId || "" }));
      }
    }
  }, [session]);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    purchasePrice: "",
    minStock: "",
    imageUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload gagal");
      setItemForm((prev) => ({ ...prev, imageUrl: json.url }));
      toast.success("Gambar berhasil diunggah");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setItemForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units");
      if (!res.ok) throw new Error("Gagal memuat unit");
      const data: UnitsResponse = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", limit.toString());
      if (filters.unitId) params.set("unitId", filters.unitId);
      if (filters.category) params.set("category", filters.category);
      if (filters.search) params.set("search", filters.search);
      if (filters.stockStatus !== "all") {
        params.set("isActive", "true");
      }

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat inventori");
      }
      const data: InventoryResponse = await res.json();
      const fetchedItems = data.data ?? [];
      setItems(fetchedItems);
      setTotalPages(data.summary?.pages ?? 1);
      setTotalItems(data.summary?.total ?? 0);

      const cats = Array.from(
        new Set(
          fetchedItems
            .map((item) => item.category)
            .filter((c): c is string => c !== null && c !== undefined),
        ),
      );
      setCategories(cats);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat inventori");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus barang ini? Tindakan ini tidak dapat dibatalkan."))
      return;
    try {
      const res = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus barang");
      }
      toast.success("Barang berhasil dihapus");
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus barang");
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemForm.name,
          sku: itemForm.sku,
          category: itemForm.category || undefined,
          imageUrl: itemForm.imageUrl || undefined,
          unitPrice: parseFloat(itemForm.unitPrice),
          purchasePrice: parseFloat(itemForm.purchasePrice) || undefined,
          minStock: parseInt(itemForm.minStock) || 0,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menambah barang");
      }
      toast.success("Barang berhasil ditambahkan");
      setShowModal(false);
      setItemForm({
        name: "",
        sku: "",
        category: "",
        unitPrice: "",
        purchasePrice: "",
        minStock: "",
        imageUrl: "",
      });
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message || "Gagal menambah barang");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(filters.search.toLowerCase());
    const matchStock =
      filters.stockStatus === "all"
        ? true
        : filters.stockStatus === "low"
          ? item.currentStock <= item.minStock && item.currentStock > 0
          : filters.stockStatus === "out"
            ? item.currentStock <= 0
            : item.currentStock > item.minStock;
    return matchSearch && matchStock;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return "out";
    if (current <= min) return "low";
    return "good";
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case "out":
        return <StatusBadge label="Habis" tone="danger" />;
      case "low":
        return <StatusBadge label="Stok Rendah" tone="warning" />;
      default:
        return <StatusBadge label="Tersedia" tone="income" />;
    }
  };

  const lowStockCount = filteredItems.filter(
    (item) => getStockStatus(item.currentStock, item.minStock) !== "good",
  ).length;

  const totalValue = filteredItems.reduce(
    (sum, item) => sum + Number(item.currentStock) * Number(item.unitPrice),
    0,
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Inventori Barang
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Kelola stok barang untuk unit retail
          </p>
        </div>
        <Link
          href="/dashboard/inventory/create"
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all self-start sm:self-auto shrink-0"
        >
          <Plus size={18} />
          <span>Tambah Barang</span>
        </Link>
      </div>

      {/* Summary — StatCard Finzo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Barang"
          value={String(filteredItems.length)}
          tone="neutral"
          icon={<Package size={15} />}
        />
        <StatCard
          label="Stok Rendah"
          value={String(lowStockCount)}
          tone="negative"
          icon={<TrendingDown size={15} />}
        />
        <StatCard
          label="Nilai Stok"
          value={formatCurrency(totalValue)}
          tone="income"
          icon={<TrendingUp size={15} />}
        />
        <StatCard
          label="Unit Terdaftar"
          value={String(units.length)}
          tone="neutral"
          icon={<Package size={15} />}
        />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Cari barang atau SKU..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className={`${finzoInputClass} pl-10`}
            />
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
          </div>

          <select
            value={filters.unitId}
            onChange={(e) => handleFilterChange("unitId", e.target.value)}
            className={`${finzoSelectClass} min-w-[140px] flex-none w-auto`}
            aria-label="Filter unit"
          >
            <option value="">Semua Unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className={`${finzoSelectClass} min-w-[140px] flex-none w-auto`}
            aria-label="Filter kategori"
          >
            <option value="">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={filters.stockStatus}
            onChange={(e) => handleFilterChange("stockStatus", e.target.value)}
            className={`${finzoSelectClass} min-w-[150px] flex-none w-auto`}
            aria-label="Filter status stok"
          >
            <option value="all">Semua Status Stok</option>
            <option value="low">Stok Rendah</option>
            <option value="good">Tersedia</option>
            <option value="out">Habis</option>
          </select>
        </div>
      </div>

      {/* Inventory list — premium responsive table */}
      {loading ? (
        <div className="rounded-[22px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="py-12 text-center text-sm text-muted-foreground">
            Memuat data...
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Package
              size={28}
              className="mx-auto mb-2 text-muted-foreground/60"
            />
            Tidak ada barang ditemukan
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="md:hidden">
            <div className="divide-y divide-border">
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(
                  item.currentStock,
                  item.minStock,
                );
                return (
                  <div key={item.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-11 w-11 rounded-xl border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                            <Package size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.sku}
                          </div>
                        </div>
                      </div>
                      {getStockBadge(stockStatus)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Kategori
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {item.category || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Harga
                        </div>
                        <div className="mt-1 font-medium text-foreground">
                          {formatCurrency(Number(item.unitPrice))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Stok
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {item.currentStock} / {item.minStock}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Nilai
                        </div>
                        <div className="mt-1 font-medium text-foreground">
                          {formatCurrency(
                            Number(item.currentStock) * Number(item.unitPrice),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                      <Link
                        href={`/dashboard/inventory/${item.id}/edit`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="Edit"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit size={15} />
                      </Link>
                      {session?.user?.role === "SUPERADMIN" ||
                      session?.user?.role === "MANAGER" ? (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus"
                          aria-label={`Hapus ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Barang
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Stok
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Harga
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Nilai
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(
                    item.currentStock,
                    item.minStock,
                  );
                  const itemValue =
                    Number(item.currentStock) * Number(item.unitPrice);

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3" data-label="Barang">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-10 w-10 rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                              <Package size={16} />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-muted-foreground"
                        data-label="Kategori"
                      >
                        {item.category || "-"}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm text-muted-foreground"
                        data-label="Stok"
                      >
                        {item.currentStock} / {item.minStock}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm font-medium text-foreground"
                        data-label="Harga"
                      >
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm font-medium text-foreground"
                        data-label="Nilai"
                      >
                        {formatCurrency(itemValue)}
                      </td>
                      <td className="px-4 py-3 text-center" data-label="Status">
                        {getStockBadge(stockStatus)}
                      </td>
                      <td className="px-4 py-3 text-center" data-label="Aksi">
                        <div className="flex justify-center gap-2">
                          <Link
                            href={`/dashboard/inventory/${item.id}/edit`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="Edit"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit size={15} />
                          </Link>
                          {session?.user?.role === "SUPERADMIN" ||
                          session?.user?.role === "MANAGER" ? (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                              title="Hapus"
                              aria-label={`Hapus ${item.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {totalItems > 0 ? (currentPage - 1) * limit + 1 : 0}-
          {Math.min(currentPage * limit, totalItems)} dari {totalItems} barang
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-1.5 border border-border rounded-full text-sm text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition"
          >
            <ChevronLeft size={14} />
            Sebelumnya
          </button>
          <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold">
            {currentPage}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage >= totalPages || loading}
            className="px-3 py-1.5 border border-border rounded-full text-sm text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition"
          >
            Berikutnya
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Create Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Tambah Barang Baru
              </h2>
            </div>
            <form onSubmit={handleCreateItem} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Nama Barang *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                    className={finzoInputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={itemForm.sku}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, sku: e.target.value })
                    }
                    className={finzoInputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Gambar Produk
                  </label>
                  <div className="space-y-2">
                    {!itemForm.imageUrl ? (
                      <label className="flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-dashed border-border bg-background cursor-pointer hover:bg-muted transition text-sm font-medium text-foreground">
                        <Upload size={16} />
                        <span>
                          {uploading ? "Mengunggah..." : "Pilih File"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative inline-block">
                        <img
                          src={itemForm.imageUrl}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <input
                      type="url"
                      placeholder="Atau masukkan URL gambar (https://...)"
                      value={itemForm.imageUrl}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, imageUrl: e.target.value })
                      }
                      className={finzoInputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={itemForm.category}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, category: e.target.value })
                    }
                    className={finzoInputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Harga Beli
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.purchasePrice}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        purchasePrice: e.target.value,
                      })
                    }
                    className={finzoInputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Harga Jual *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={itemForm.unitPrice}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, unitPrice: e.target.value })
                    }
                    className={finzoInputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Stok Minimum
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.minStock}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, minStock: e.target.value })
                    }
                    className={finzoInputClass}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setItemForm({
                      name: "",
                      sku: "",
                      category: "",
                      unitPrice: "",
                      purchasePrice: "",
                      minStock: "",
                      imageUrl: "",
                    });
                  }}
                  className="flex-1 min-h-[40px] rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 min-h-[40px] rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Badge status stok Finzo-style */
function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "income" | "warning" | "danger";
}) {
  const styles = {
    income: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${styles[tone]}`}
    >
      {label}
    </span>
  );
}
