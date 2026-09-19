"use client";

import { useState, useEffect, useCallback } from "react";
import type { Transaction, UnitAgg } from "./useDashboardData";

export interface UseLiveTransactionsResult {
  transactions: Transaction[];
  units: UnitAgg[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook untuk transaksi real-time (single fetch).
 * Auto-refresh interval dihapus — hanya fetch sekali untuk
 * mengurangi beban backend. Data dapat di-refresh manual via refetch().
 */
export function useLiveTransactions(
  limit: number = 10,
): UseLiveTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [units, setUnits] = useState<UnitAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions?limit=${limit}`);

      if (!res.ok) {
        throw new Error(`Gagal memuat transaksi: ${res.status}`);
      }

      const json = await res.json();
      const txList = json.data ?? json.transactions ?? json ?? [];
      const items: Transaction[] = txList.map(
        (raw: Record<string, unknown>) => {
          // Map API status to frontend status
          const apiStatus = String(raw.status ?? "");
          const status: Transaction["status"] =
            apiStatus === "APPROVED"
              ? "COMPLETED"
              : (apiStatus as Transaction["status"]);

          return {
            id: String(raw.id ?? ""),
            type: raw.type as Transaction["type"],
            amount: Number(raw.amount ?? 0),
            description: String(raw.description ?? ""),
            date:
              typeof raw.date === "string"
                ? raw.date
                : new Date().toISOString(),
            status,
            unit: raw.unit ? String(raw.unit) : undefined,
            unitName: raw.unitName
              ? String(raw.unitName)
              : raw.unit
                ? String(raw.unit)
                : undefined,
          };
        },
      );

      setTransactions(items);

      // Fetch units if not loaded
      if (units.length === 0) {
        try {
          const unitsRes = await fetch("/api/units");
          if (unitsRes.ok) {
            const unitsJson = await unitsRes.json();
            const unitList: UnitAgg[] = (
              unitsJson.units ??
              unitsJson ??
              []
            ).map((raw: Record<string, unknown>): UnitAgg => ({
              id: String(raw.id ?? ""),
              name: String(raw.name ?? ""),
              type: String(raw.type ?? ""),
              balance: Number(raw.balance ?? 0),
              income: Number(raw.income ?? 0),
              expense: Number(raw.expense ?? 0),
              transactions: Number(raw.transactions ?? 0),
            }));
            setUnits(unitList);
          }
        } catch {
          // Units fetch failed silently
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat transaksi");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Single fetch — no auto-refresh interval
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    units,
    loading,
    error,
    refetch: fetchTransactions,
  };
}
