"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Wallet, Loader2, ShieldCheck } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type Account = {
  id: string;
  studentName: string;
  studentNumber: string;
  unitName: string;
  balance: number;
  dailySpendLimit: number | null;
  spentToday: number;
  status: string;
};

export default function SavingsLimitsPage() {
  const [role, setRole] = useState("STAFF");
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [unitId, setUnitId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setRole(s?.user?.role || "STAFF"))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = unitId ? `?unitId=${unitId}` : "";
      const res = await fetch(`/api/savings/limits${q}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memuat akun");
      setAccounts(body.data || []);
      setUnits(body.units || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveLimit = async (account: Account) => {
    const raw = editing[account.id];
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/savings/limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id, dailySpendLimit: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal simpan batas");
      setMsg("Batas belanja disimpan");
      setEditing((prev) => {
        const next = { ...prev };
        delete next[account.id];
        return next;
      });
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck size={20} /> Batas Belanja Tabungan
          </h1>
          <p className="text-sm text-muted-foreground">Batas belanja harian (WIB) kartu SMART_CARD per santri</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </div>

      {(role === "SUPERADMIN" || role === "PIMPINAN") && units.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted-foreground">Unit:</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Semua —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">{err}</div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">{msg}</div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Wallet size={16} /> Akun Tabungan ({accounts.length})
        </h2>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">
            <Loader2 size={18} className="mx-auto animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">Tidak ada akun</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => {
              const over = a.dailySpendLimit !== null && a.spentToday > a.dailySpendLimit;
              return (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {a.studentName}
                        {a.studentNumber ? ` (${a.studentNumber})` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.unitName} · saldo {fmt(a.balance)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs ${over ? "text-rose-600" : "text-muted-foreground"}`}>
                        Terpakai hari ini: {fmt(a.spentToday)}
                        {a.dailySpendLimit !== null && ` / ${fmt(a.dailySpendLimit)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Batas: {a.dailySpendLimit !== null ? fmt(a.dailySpendLimit) : "tak terbatas"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="number"
                      min="0"
                      placeholder="Kosongkan = tak terbatas"
                      className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-1.5"
                      value={editing[a.id] ?? ""}
                      onChange={(e) => setEditing({ ...editing, [a.id]: e.target.value })}
                    />
                    <button
                      onClick={() => saveLimit(a)}
                      disabled={busy || editing[a.id] === undefined}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                      Simpan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}