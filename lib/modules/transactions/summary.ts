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
  const resolvedNetBalance =
    netBalance ?? Math.max(0, totalIncome - totalExpense);
  const resolvedNetToday = netToday ?? Math.max(0, todayIncome - todayExpense);

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
