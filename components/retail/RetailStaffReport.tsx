"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (Math.abs(n) >= 1_000)
    return `${Math.round(n / 1_000)} rb`;
  return String(Math.round(n));
};

interface Row {
  month: string;
  income: number;
  expense: number;
  transfer: number;
}

const PERIODS = [
  { id: "daily", label: "7 hari" },
  { id: "weekly", label: "30 hari" },
  { id: "monthly", label: "6 bulan" },
];

function labelOf(m: string) {
  const parts = m.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  if (parts.length === 2) {
    const names = [
      "", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    return names[Number(parts[1])] || m;
  }
  return m;
}

export function RetailStaffReport() {
  const { data: session } = useSession();
  const unitId = (session?.user as any)?.unitId || "";
  const [unitName, setUnitName] = useState("");
  const [period, setPeriod] = useState("daily");
  const [rows, setRows] = useState<Row[]>([]);
  const [stat, setStat] = useState({ in: 0, out: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unitId) return;
    fetch("/api/units")
      .then((r) => r.json())
      .then((b) =>
        setUnitName((b.data ?? []).find((u: any) => u.id === unitId)?.name || ""),
      )
      .catch(() => {});
  }, [unitId]);

  useEffect(() => {
    if (!unitId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reports/aggregations?period=${period}&unitId=${unitId}`,
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Gagal memuat");
        const d = body.data;
        setRows(d?.monthlyData ?? []);
        setStat({
          in: d?.statCards?.totalIncome ?? 0,
          out: d?.statCards?.totalExpense ?? 0,
          net: d?.statCards?.netProfit ?? 0,
        });
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [unitId, period]);

  const max = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expense)));

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div>
        <h1 className="text-xl font-bold">
          Laporan{unitName ? ` · ${unitName}` : ""}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ringkasan pemasukan & pengeluaran unit.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Masuk", value: stat.in, cls: "text-emerald-600" },
          { label: "Keluar", value: stat.out, cls: "text-rose-600" },
          { label: "Bersih", value: stat.net, cls: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className={`truncate text-sm font-bold ${s.cls}`}>
              {fmtShort(s.value)}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {fmtRp(s.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`h-8 rounded-lg border px-3 text-xs font-medium transition ${
              period === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Memuat…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Belum ada data periode ini
          </p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.month} className="px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{labelOf(r.month)}</span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-emerald-600">
                      +{fmtShort(r.income)}
                    </span>
                    {" · "}
                    <span className="font-semibold text-rose-600">
                      −{fmtShort(r.expense)}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 space-y-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(r.income / max) * 100}%` }}
                    />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${(r.expense / max) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
