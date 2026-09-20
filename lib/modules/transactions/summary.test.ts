import assert from "node:assert/strict";
import test from "node:test";
import { buildTransactionSummary } from "./summary";
import { buildReconciliationSummary } from "../reconciliation/summary";
import {
  getOperationalScope,
  getUnitBusinessProfile,
  getDefaultCategorySuggestions,
} from "../units/business-rules";
import { buildCashbookEntries, buildLedgerSummary } from "../ledger/ledger";
import { buildCategoryVisibilityWhere } from "../financial-categories/category-visibility";
import { buildApprovalScope } from "../approvals/scope";
import { validateBusinessFlow } from "../units/business-rules";
import { buildReportScope } from "../reports/scope";

test("buildTransactionSummary calculates valid pagination and dashboard counts", () => {
  const result = buildTransactionSummary({
    total: 54,
    limit: 10,
    todayCount: 12,
    pendingCount: 4,
    draftCount: 2,
    totalIncome: 8500000,
    totalExpense: 3200000,
    netBalance: 5300000,
    todayIncome: 1200000,
    todayExpense: 300000,
    netToday: 900000,
  });

  assert.equal(result.total, 54);
  assert.equal(result.pages, 6);
  assert.equal(result.todayCount, 12);
  assert.equal(result.pendingCount, 4);
  assert.equal(result.draftCount, 2);
  assert.equal(result.totalIncome, 8500000);
  assert.equal(result.totalExpense, 3200000);
  assert.equal(result.netBalance, 5300000);
  assert.equal(result.todayIncome, 1200000);
  assert.equal(result.todayExpense, 300000);
  assert.equal(result.netToday, 900000);
});

test("buildTransactionSummary keeps at least one page even when total is zero", () => {
  const result = buildTransactionSummary({
    total: 0,
    limit: 10,
    todayCount: 0,
    pendingCount: 0,
    draftCount: 0,
  });

  assert.equal(result.pages, 1);
});

test("buildReconciliationSummary aggregates task totals and counts correctly", () => {
  const result = buildReconciliationSummary([
    { income: 500000, expense: 200000, variance: 300000, status: "PENDING" },
    { income: 350000, expense: 150000, variance: 200000, status: "RECONCILED" },
    { income: 250000, expense: 100000, variance: 150000, status: "RECONCILED" },
  ]);

  assert.equal(result.totalIncome, 1100000);
  assert.equal(result.totalExpense, 450000);
  assert.equal(result.totalVariance, 650000);
  assert.equal(result.pendingCount, 1);
  assert.equal(result.reconciledCount, 2);
});

test("business rules separate KPAK operations from retail sales workflows", () => {
  const kpak = getUnitBusinessProfile("KPAK", false);
  const retail = getUnitBusinessProfile("KANTIN", true);

  assert.equal(getOperationalScope(false, "KPAK"), "KPAK");
  assert.equal(getOperationalScope(true, "KANTIN"), "RETAIL");
  assert.ok(
    kpak.primaryFlow.includes("Tabungan") ||
      kpak.primaryFlow.includes("pembayaran"),
  );
  assert.ok(
    retail.primaryFlow.includes("Penjualan") ||
      retail.primaryFlow.includes("unit retail"),
  );
});

test("buildLedgerSummary calculates running cashbook totals without relying on page slices", () => {
  const transactions = [
    {
      id: "1",
      date: "2025-01-01",
      type: "INCOME",
      amount: 100000,
      description: "Setoran santri",
    },
    {
      id: "2",
      date: "2025-01-02",
      type: "EXPENSE",
      amount: 25000,
      description: "Biaya operasional",
    },
    {
      id: "3",
      date: "2025-01-03",
      type: "INCOME",
      amount: 50000,
      description: "Penjualan",
    },
  ] as const;

  const ledger = buildLedgerSummary(transactions as any);

  assert.equal(ledger.totalIncome, 150000);
  assert.equal(ledger.totalExpense, 25000);
  assert.equal(ledger.netBalance, 125000);
  assert.equal(ledger.transactionCount, 3);
});

test("buildCashbookEntries keeps chronological balance running totals", () => {
  const entries = buildCashbookEntries([
    {
      id: "1",
      date: "2025-01-01",
      type: "INCOME",
      amount: 100000,
      description: "Setoran",
    },
    {
      id: "2",
      date: "2025-01-02",
      type: "EXPENSE",
      amount: 40000,
      description: "Pembelian",
    },
    {
      id: "3",
      date: "2025-01-03",
      type: "INCOME",
      amount: 20000,
      description: "Penjualan",
    },
  ] as any);

  assert.equal(entries[0].debit, 100000);
  assert.equal(entries[0].credit, 0);
  assert.equal(entries[0].balance, 100000);
  assert.equal(entries[1].balance, 60000);
  assert.equal(entries[2].balance, 80000);
});

test("default category suggestions follow actual KPAK and retail flow", () => {
  const kpakIncome = getDefaultCategorySuggestions("KPAK", false, "INCOME");
  const retailExpense = getDefaultCategorySuggestions(
    "KANTIN",
    true,
    "EXPENSE",
  );

  assert.ok(kpakIncome.some((item) => item.toLowerCase().includes("tabungan")));
  assert.ok(
    retailExpense.some(
      (item) =>
        item.toLowerCase().includes("stok") ||
        item.toLowerCase().includes("persediaan"),
    ),
  );
});

test("staff and manager category visibility include their unit categories plus lembaga defaults", () => {
  const staffWhere = buildCategoryVisibilityWhere({
    role: "STAFF",
    lembagaId: "lembaga-1",
    sessionUnitId: "unit-44",
  });
  const managerWhere = buildCategoryVisibilityWhere({
    role: "MANAGER",
    lembagaId: "lembaga-1",
    sessionUnitId: "unit-44",
  });

  assert.equal(staffWhere.lembagaId, "lembaga-1");
  assert.deepEqual(staffWhere.OR, [{ unitId: "unit-44" }, { unitId: null }]);
  assert.deepEqual(managerWhere.OR, [{ unitId: "unit-44" }, { unitId: null }]);
});

test("approval scope keeps leader visibility intact even when a unit filter is applied", () => {
  const where = buildApprovalScope({
    role: "PIMPINAN",
    userId: "pimpinan-9",
    lembagaId: "lembaga-1",
    requestedUnitId: "unit-44",
    lembagaUnitIds: ["unit-44", "unit-77"],
  });

  assert.equal(where.status, "PENDING");
  assert.deepEqual(where.OR, [
    { approverId: "pimpinan-9" },
    { unitId: { in: ["unit-44"] } },
  ]);
  assert.equal(where.unitId, "unit-44");
});

test("approval scope gives staff visibility to their own submitted transactions and unit queue", () => {
  const where = buildApprovalScope({
    role: "STAFF",
    userId: "staff-3",
    userUnitId: "unit-44",
    lembagaId: "lembaga-1",
  });

  assert.equal(where.status, "PENDING");
  assert.deepEqual(where.OR, [
    { unitId: "unit-44" },
    { transactions: { createdById: "staff-3" } },
  ]);
});

test("business flow validator rejects mismatched KPAK and retail transactions", () => {
  const invalidKpakIncome = validateBusinessFlow({
    unitType: "KPAK",
    isRetail: false,
    transactionType: "INCOME",
    description: "Penjualan buku di kantin",
  });

  const validKpakIncome = validateBusinessFlow({
    unitType: "KPAK",
    isRetail: false,
    transactionType: "INCOME",
    description: "Setoran tabungan santri",
  });

  const validRetailIncome = validateBusinessFlow({
    unitType: "KANTIN",
    isRetail: true,
    transactionType: "INCOME",
    description: "Penjualan makanan dan minuman",
  });

  assert.equal(invalidKpakIncome.valid, false);
  assert.equal(validKpakIncome.valid, true);
  assert.equal(validRetailIncome.valid, true);
});

test("report scope allows staff to view their unit and leaders to view their lembaga", () => {
  const staffScope = buildReportScope({
    role: "STAFF",
    userUnitId: "unit-7",
    lembagaId: "lembaga-1",
  });

  const leaderScope = buildReportScope({
    role: "PIMPINAN",
    userUnitId: "unit-9",
    lembagaId: "lembaga-1",
    lembagaUnitIds: ["unit-7", "unit-9"],
  });

  assert.equal(staffScope.allowed, true);
  assert.equal(staffScope.unitFilter, "unit-7");
  assert.equal(leaderScope.allowed, true);
  assert.deepEqual(leaderScope.unitFilter, { in: ["unit-7", "unit-9"] });
});
