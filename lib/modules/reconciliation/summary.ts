export interface ReconciliationTaskMetric {
  income: number;
  expense: number;
  variance: number;
  status: "RECONCILED" | "PENDING" | string;
}

export interface ReconciliationSummary {
  totalIncome: number;
  totalExpense: number;
  totalVariance: number;
  reconciledCount: number;
  pendingCount: number;
}

export function buildReconciliationSummary(
  tasks: ReconciliationTaskMetric[],
): ReconciliationSummary {
  return {
    totalIncome: tasks.reduce((sum, task) => sum + Number(task.income || 0), 0),
    totalExpense: tasks.reduce(
      (sum, task) => sum + Number(task.expense || 0),
      0,
    ),
    totalVariance: tasks.reduce(
      (sum, task) => sum + Number(task.variance || 0),
      0,
    ),
    reconciledCount: tasks.filter((task) => task.status === "RECONCILED")
      .length,
    pendingCount: tasks.filter((task) => task.status === "PENDING").length,
  };
}
