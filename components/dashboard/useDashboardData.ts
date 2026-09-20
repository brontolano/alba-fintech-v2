"use client";

import { useState, useEffect, useCallback } from "react";

export type TxType = "INCOME" | "EXPENSE" | "TRANSFER";
export type TxStatus =
  "DRAFT" | "PENDING" | "APPROVED" | "COMPLETED" | "FAILED" | "REJECTED";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  date: string;
  status: TxStatus;
  category?: string;
  unit?: string;
  unitName?: string;
}

export interface UnitAgg {
  id: string;
  name: string;
  type: string;
  balance: number;
  income: number;
  expense: number;
  transactions: number;
}

export interface ChartData {
  labels: string[];
  income: number[];
  expense: number[];
}

export interface CategoryEntry {
  name: string;
  amount: number;
}

export interface ApprovalEntry {
  id: string;
  type: string;
  amount: number;
  description: string;
  requester: string;
  unit: string;
  date: string;
}

export interface UnitSummary {
  id: string;
  name: string;
  balance: number;
  isOnline?: boolean;
}

export type { UnitAgg as UnitAggType };

export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  todayIncome: number;
  todayExpense: number;
  todayTransactions: number;
  netToday: number;
  pendingApprovals: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentTransactions: Transaction[];
  recentApprovals: ApprovalEntry[];
  units: UnitAgg[];
  chartData?: ChartData;
  expenseByCategory?: CategoryEntry[];
}

export interface UseDashboardDataProps {
  range?: string;
  unitId?: string;
}

export type RangeOption = "today" | "7d" | "30d" | "90d";

export interface UseDashboardDataResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  formatCurrency: (value: number) => string;
  refetch: (range?: string, unitId?: string) => Promise<void>;
  activeRange: RangeOption;
  selectedUnit: string;
  setActiveRange: (range: RangeOption) => void;
  setSelectedUnit: (unitId: string) => void;
}

const DEFAULT_DATA: DashboardData = {
  summary: {
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    todayIncome: 0,
    todayExpense: 0,
    todayTransactions: 0,
    netToday: 0,
    pendingApprovals: 0,
  },
  recentTransactions: [],
  recentApprovals: [],
  units: [],
};

export function useDashboardData(
  props?: UseDashboardDataProps,
): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<RangeOption>(
    (props?.range ?? "today") as RangeOption,
  );
  const [selectedUnit, setSelectedUnit] = useState<string>(props?.unitId ?? "");

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  }, []);
  const transformSummary = (
    raw: Record<string, unknown>,
  ): DashboardSummary => ({
    totalBalance: Number(raw.totalBalance ?? 0),
    totalIncome: Number(raw.totalIncome ?? 0),
    totalExpense: Number(raw.totalExpense ?? 0),
    todayIncome: Number(raw.todayIncome ?? 0),
    todayExpense: Number(raw.todayExpense ?? 0),
    todayTransactions: Number(raw.todayTransactions ?? 0),
    netToday: Number(raw.netToday ?? 0),
    pendingApprovals: Number(raw.pendingApprovals ?? 0),
  });

  const transformTx = (raw: Record<string, unknown>): Transaction => ({
    id: String(raw.id ?? ""),
    type: raw.type as TxType,
    amount: Number(raw.amount ?? 0),
    description: String(raw.description ?? ""),
    date: typeof raw.date === "string" ? raw.date : new Date().toISOString(),
    status: raw.status as TxStatus,
    category: raw.category ? String(raw.category) : undefined,
    unit: raw.unit ? String(raw.unit) : undefined,
    unitName: raw.unitName
      ? String(raw.unitName)
      : raw.unit
        ? String(raw.unit)
        : undefined,
  });

  const transformApproval = (raw: Record<string, unknown>): ApprovalEntry => ({
    id: String(raw.id ?? ""),
    type: String(raw.type ?? "TRANSACTION"),
    amount: Number(raw.amount ?? 0),
    description: String(raw.description ?? ""),
    requester: String(raw.requester ?? raw.user ?? ""),
    unit: String(raw.unit ?? ""),
    date: typeof raw.date === "string" ? raw.date : new Date().toISOString(),
  });

  const fetchDashboardData = useCallback(
    async (rangeOverride?: string, unitOverride?: string) => {
      const range = rangeOverride ?? activeRange;
      const unit = unitOverride ?? selectedUnit;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ range });
        if (unit) params.set("unitId", unit);

        const res = await fetch(
          `/api/dashboard/aggregates?${params.toString()}`,
        );

        if (!res.ok) {
          const text = await res.text();
          let detail = "";
          try {
            const json = JSON.parse(text);
            detail = json.error ?? json.message ?? "";
          } catch {
            detail = text;
          }
          throw new Error(`Gagal memuat data: ${res.status} ${detail}`);
        }

        const json = await res.json();

        // API mengembalikan { data: { summary, units, ... } }
        const apiData = json.data ?? json;

        const result: DashboardData = {
          summary: transformSummary(apiData.summary ?? {}),
          recentTransactions: (apiData.recentTransactions ?? []).map(
            transformTx,
          ),
          recentApprovals: (apiData.recentApprovals ?? []).map(
            transformApproval,
          ),
          units: (apiData.units ?? []).map(
            (raw: Record<string, unknown>): UnitAgg => ({
              id: String(raw.id ?? ""),
              name: String(raw.name ?? ""),
              type: String(raw.type ?? ""),
              balance: Number(raw.balance ?? 0),
              income: Number(raw.income ?? 0),
              expense: Number(raw.expense ?? 0),
              transactions: Number(raw.transactions ?? 0),
            }),
          ),
          chartData: apiData.chartData
            ? {
                labels: (apiData.chartData.labels ?? []) as string[],
                income: (apiData.chartData.income ?? []) as number[],
                expense: (apiData.chartData.expense ?? []) as number[],
              }
            : undefined,
          expenseByCategory: apiData.expenseByCategory
            ? (apiData.expenseByCategory as Record<string, unknown>[]).map(
                (c) => ({
                  name: String(c.name ?? ""),
                  amount: Number(c.amount ?? 0),
                }),
              )
            : undefined,
        };

        setData(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Gagal memuat data dashboard";
        setError(message);
        // Fallback ke data kosong agar UI tetap render
        setData(DEFAULT_DATA);
      } finally {
        setLoading(false);
      }
    },
    [activeRange, selectedUnit],
  );

  const refetch = useCallback(
    async (range?: string, unitId?: string) => {
      if (range !== undefined) setActiveRange(range as RangeOption);
      if (unitId !== undefined) setSelectedUnit(unitId || "");
      await fetchDashboardData(
        range ?? activeRange,
        unitId ?? selectedUnit ?? undefined,
      );
    },
    [fetchDashboardData, activeRange, selectedUnit],
  );

  // Initial fetch only — no auto-refresh (manual refetch via returned refetch)
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    loading,
    error,
    formatCurrency,
    refetch,
    activeRange,
    selectedUnit,
    setActiveRange,
    setSelectedUnit,
  };
}
