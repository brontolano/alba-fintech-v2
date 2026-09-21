"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Search,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

type Tab = "semua" | "kas" | "tabungan";

interface LedgerEntry {
  key: string;
  dateISO: string;
  kind: "kas" | "tabungan";
  dir: "in" | "out";
  title: string;
  sub: string;
  amount: number;
}

export function KpakCashOverview() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [savingsStock, setSavingsStock] = useState(0);
  const [santriCount, setSantriCount] = useState(0);
  const [todayIn, setTodayIn] = useState(0);
  const [todayOut, setTodayOut] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("semua");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [stuRes, txRes, svRes] = await Promise.all([
          fetch("/api/savings/students"),
          fetch("/api/transactions?limit=100"),
          fetch("/api/savings/transactions"),
        ]);
        const ledger: LedgerEntry[] = [];

        if (stuRes.ok) {
          const s = await stuRes.json();
          const list = s.data || [];
          setSantriCount(list.length);
          setSavingsStock(
            list.reduce(
              (sum: number, x: any) => sum + Number(x.account?.balance || 0),
              0,
            ),
          );
        }

        if (txRes.ok) {
          const t = await txRes.json();
          const list = t.data || t.transactions || [];
          for (const x of list) {
            if (x.status === "REJECTED") continue;
            ledger.push({
              key: `kas-${x.id}`,
              dateISO: x.date || x.createdAt || "",
              kind: "kas",
              dir: x.type === "INCOME" ? "in" : "out",
              title: x.description || "Transaksi kas",
              sub: `${x.category?.name || "Tanpa kategori"} · ${x.status}`,
              amount: Number(x.amount || 0),
            });
          }
          const today = new Date().toISOString().slice(0, 10);
          setTodayIn(
            list
              .filter(
                (x: any) =>
                  x.type === "INCOME" &&
                  x.status !== "REJECTED" &&
                  (x.date || "").slice(0, 10) === today,
              )
              .reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
          );
          setTodayOut(
            list
              .filter(
                (x: any) =>
                  x.type === "EXPENSE" &&
                  x.status !== "REJECTED" &&
                  (x.date || "").slice(0, 10) === today,
              )
              .reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
          );
        }

        if (svRes.ok) {
          const s = await svRes.json();
          const list = s.data || [];
          for (const x of list) {
            const stu = x.account?.student;
            ledger.push({
              key: `tab-${x.id}`,
              dateISO: x.createdAt || "",
              kind: "tabungan",
              dir: x.type === "DEPOSIT" ? "in" : "out",
              title: `${x.type === "DEPOSIT" ? "Setoran" : "Penarikan"} — ${stu?.name || "Santri"}`,
              sub: `${stu?.studentNumber || ""}${x.description ? ` · ${x.description}` : ""}`,
              amount: Number(x.amount || 0),
            });
          }
        }

        ledger.sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
        setEntries(ledger.slice(0, 80));
      } catch {
        toast.error("Gagal memuat posisi kas");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (tab !== "semua" && e.kind !== tab) return false;
      if (
        q &&
        !`${e.title} ${e.sub}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [entries, tab, search]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "semua", label: "Semua" },
    { id: "kas", label: "Kas & Layanan" },
    { id: "tabungan", label: "Tabungan" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kas Unit KPAK</h1>
        <p className="text-sm text-muted-foreground">
          Posisi kas saat ini: total tabungan santri + arus kas hari ini +
          rincian gabungan
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <PiggyBank
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Saldo Tabungan
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(savingsStock)}
              </p>
              <p className="text-xs text-muted-foreground">
                {santriCount} santri
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <TrendingUp
                size={20}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kas masuk hari ini</p>
              <p className="text-2xl font-bold">{formatCurrency(todayIn)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-500/10 p-2.5">
              <TrendingDown
                size={20}
                className="text-rose-600 dark:text-rose-400"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Kas keluar hari ini
              </p>
              <p className="text-2xl font-bold">{formatCurrency(todayOut)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/70"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="relative ml-auto min-w-48 flex-1 sm:max-w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari keterangan..."
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
            Memuat rincian...
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada data pada filter ini
          </p>
        ) : (
          <div className="divide-y">
            {filtered.map((e) => (
              <div
                key={e.key}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`rounded-lg p-1.5 ${
                      e.dir === "in"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {e.dir === "in" ? (
                      <ArrowDownRight size={14} />
                    ) : (
                      <ArrowUpRight size={14} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span
                        className={`mr-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          e.kind === "kas"
                            ? "bg-primary/10 text-primary"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {e.kind === "kas" ? "Kas" : "Tabungan"}
                      </span>
                      {e.sub} ·{" "}
                      {e.dateISO
                        ? new Date(e.dateISO).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>
                <p
                  className={`shrink-0 font-semibold ${
                    e.dir === "in"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {e.dir === "in" ? "+" : "-"}
                  {formatCurrency(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
