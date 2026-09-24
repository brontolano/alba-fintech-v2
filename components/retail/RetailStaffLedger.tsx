"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { StatusPill } from "@/components/ui/finzo";

interface Tx {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string;
  amount: number;
  categoryName?: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  reference?: string;
  createdByName?: string;
  balanceAfter?: number;
}

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const fmtDate = (v: string) =>
  new Date(v).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export function RetailStaffLedger() {
  const { data: session } = useSession();
  const unitId = (session?.user as any)?.unitId || "";
  const [unitName, setUnitName] = useState("");

  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sumIn, setSumIn] = useState(0);
  const [sumOut, setSumOut] = useState(0);
  const [sumSaldo, setSumSaldo] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!unitId) return;
    fetch("/api/units")
      .then((r) => r.json())
      .then((b) => {
        const list = b.data ?? [];
        setUnitName(list.find((u: any) => u.id === unitId)?.name || "");
      })
      .catch(() => {});
  }, [unitId]);

  useEffect(() => {
    if (!unitId) return;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          unitId,
        });
        if (q) params.set("search", q);
        if (type) params.set("type", type);
        if (status) params.set("status", status);
        if (period !== "all") {
          const end = new Date();
          const start = new Date();
          if (period === "today") start.setHours(0, 0, 0, 0);
          else if (period === "7d") start.setDate(end.getDate() - 6);
          else start.setDate(end.getDate() - 29);
          params.set("startDate", toInputDate(start));
          params.set("endDate", toInputDate(end));
        }
        const res = await fetch(`/api/transactions?${params.toString()}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Gagal memuat");
        setItems(body.data ?? []);
        setPages(body.summary?.pages ?? 1);
        setTotal(body.summary?.total ?? 0);
        setSumIn(body.summary?.totalIncome ?? 0);
        setSumOut(body.summary?.totalExpense ?? 0);
        setSumSaldo(body.summary?.netBalance ?? 0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [unitId, page, q, type, status, period]);

  const resetAll = () => {
    setSearch("");
    setType("");
    setStatus("");
    setPeriod("30d");
    setPage(1);
  };
  const hasFilter = q !== "" || type !== "" || status !== "" || period !== "30d";

  const sel =
    "h-9 appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-xs outline-none transition focus:border-primary";

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold">
          Buku Kas{unitName ? ` · ${unitName}` : ""}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Catatan keuangan unit — pemasukan & pengeluaran tercatat otomatis.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Masuk", value: fmtRp(sumIn), cls: "text-emerald-600" },
          { label: "Keluar", value: fmtRp(sumOut), cls: "text-rose-600" },
          { label: "Saldo", value: fmtRp(sumSaldo), cls: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className={`truncate text-sm font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-2.5">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari keterangan…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <div className="relative">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className={sel}
              aria-label="Tipe"
            >
              <option value="">Masuk+Keluar</option>
              <option value="INCOME">Masuk</option>
              <option value="EXPENSE">Keluar</option>
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={sel}
              aria-label="Status"
            >
              <option value="">Semua status</option>
              <option value="APPROVED">Disetujui</option>
              <option value="PENDING">Pending</option>
              <option value="DRAFT">Draft</option>
              <option value="REJECTED">Ditolak</option>
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setPage(1);
              }}
              className={sel}
              aria-label="Periode"
            >
              <option value="today">Hari ini</option>
              <option value="7d">7 hari</option>
              <option value="30d">30 hari</option>
              <option value="all">Semua</option>
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          {hasFilter && (
            <button
              onClick={resetAll}
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Memuat…
          </p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Belum ada catatan
          </p>
        ) : (
          <div className="divide-y">
            {items.map((tx) => {
              const open = expandedId === tx.id;
              const masuk = tx.type === "INCOME";
              return (
                <div key={tx.id}>
                  <button
                    onClick={() => setExpandedId(open ? null : tx.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
                  >
                    <div className="w-11 shrink-0 text-center">
                      <p className="text-lg font-bold leading-none">
                        {new Date(tx.date).getDate()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {fmtDate(tx.date).split(" ").slice(1).join(" ")}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {tx.description || tx.reference || "(tanpa deskripsi)"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <StatusPill status={tx.status} />
                        <span className="truncate">
                          {tx.createdByName ? `oleh ${tx.createdByName}` : ""}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-bold ${
                          masuk ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {masuk ? "+" : "−"}
                        {fmtRp(tx.amount)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Sisa {fmtRp(tx.balanceAfter ?? 0)}
                      </p>
                    </div>
                  </button>
                  {open && (
                    <div className="grid grid-cols-2 gap-1.5 bg-muted/30 px-3 py-2 text-xs">
                      <p className="text-muted-foreground">
                        Kategori:{" "}
                        <span className="font-medium text-foreground">
                          {tx.categoryName || "—"}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Referensi:{" "}
                        <span className="font-medium text-foreground">
                          {tx.reference || "—"}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total === 0 ? "0 catatan" : `Hal ${page}/${pages} · ${total} catatan`}
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || loading}
            className="flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, pages))}
            disabled={page >= pages || loading}
            className="flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
