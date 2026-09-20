export type LedgerTransactionInput = {
  id: string;
  date: string | Date | null;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number | string;
  description?: string | null;
  reference?: string | null;
  unitName?: string | null;
  categoryName?: string | null;
  status?: string | null;
};

export type LedgerEntry = {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  reference?: string | null;
  unitName?: string | null;
  categoryName?: string | null;
};

export type LedgerSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
};

export function buildCashbookEntries(
  transactions: LedgerTransactionInput[],
): LedgerEntry[] {
  const ordered = [...transactions].sort((a, b) => {
    const aDate = a.date ? new Date(a.date).getTime() : 0;
    const bDate = b.date ? new Date(b.date).getTime() : 0;
    return aDate - bDate;
  });

  let runningBalance = 0;

  return ordered.map((transaction) => {
    const amount = Number(transaction.amount ?? 0);
    const isIncome = transaction.type === "INCOME";
    const isExpense = transaction.type === "EXPENSE";
    const dateValue = transaction.date ? new Date(transaction.date) : null;

    if (isIncome) {
      runningBalance += amount;
    } else if (isExpense) {
      runningBalance -= amount;
    }

    return {
      id: transaction.id,
      date: dateValue ? dateValue.toISOString().slice(0, 10) : "",
      description:
        transaction.description || transaction.reference || "Transaksi",
      debit: isIncome ? amount : 0,
      credit: isExpense ? amount : 0,
      balance: runningBalance,
      type: transaction.type,
      reference: transaction.reference || null,
      unitName: transaction.unitName || null,
      categoryName: transaction.categoryName || null,
    };
  });
}

export function buildLedgerSummary(
  transactions: LedgerTransactionInput[],
): LedgerSummary {
  const totalIncome = transactions
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpense = transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    transactionCount: transactions.length,
  };
}
