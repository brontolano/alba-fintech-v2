export type TransactionSummary = {
  total: number;
  pages: number;
  todayCount: number;
  pendingCount: number;
  draftCount: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  todayIncome: number;
  todayExpense: number;
  netToday: number;
};

export function buildTransactionSummary({
  total,
  limit,
  todayCount,
  pendingCount,
  draftCount,
  totalIncome = 0,
  totalExpense = 0,
  netBalance,
  todayIncome = 0,
  todayExpense = 0,
  netToday,
}: {
  total: number;
  limit: number;
  todayCount: number;
  pendingCount: number;
  draftCount: number;
  totalIncome?: number;
  totalExpense?: number;
  netBalance?: number;
  todayIncome?: number;
  todayExpense?: number;
  netToday?: number;
}): TransactionSummary {
  // Fallback menghitung dari totalIncome/totalExpense & todayIncome/todayExpense.
  // Jangan paksa 0 untuk defisit: saldo negatif valid untuk laporan (UI
  // sudah memilih tone "expense"/merah untuk nilai < 0, mis. ManagerDashboard
  // dan PimpinanBukuKas). Konsisten dengan buildLedgerSummary yang juga
  // mengembalikan netBalance = income - expense tanpa clamping.
  const resolvedNetBalance =
    netBalance ?? totalIncome - totalExpense;
  const resolvedNetToday = netToday ?? todayIncome - todayExpense;

  return {
    total,
    pages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
    todayCount,
    pendingCount,
    draftCount,
    totalIncome,
    totalExpense,
    netBalance: resolvedNetBalance,
    todayIncome,
    todayExpense,
    netToday: resolvedNetToday,
  };
}
