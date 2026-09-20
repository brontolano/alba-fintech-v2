export type UnitType = "KPAK" | "KOPERASI" | "KANTIN" | "UMUM" | string;
export type OperationalScope = "KPAK" | "RETAIL" | "GENERAL";

export function getOperationalScope(
  isRetail?: boolean,
  unitType?: UnitType,
): OperationalScope {
  if (unitType === "KPAK") return "KPAK";
  if (isRetail === true || unitType === "KOPERASI" || unitType === "KANTIN") {
    return "RETAIL";
  }
  return "GENERAL";
}

export function getUnitBusinessProfile(
  unitType?: UnitType,
  isRetail?: boolean,
) {
  const scope = getOperationalScope(isRetail, unitType);

  switch (scope) {
    case "KPAK":
      return {
        mode: "kpak-operational",
        label: "KPAK",
        primaryFlow:
          "Tabungan santri, pendaftaran/daftar ulang, pembayaran HER/SPP, dan keuangan internal unit",
        incomeExamples: [
          "Setoran tabungan santri",
          "Pendaftaran / daftar ulang",
          "Pembayaran HER / SPP",
          "Keuangan internal masuk",
        ],
        expenseExamples: [
          "Tarik tabungan santri",
          "Pengeluaran internal KPAK",
          "Biaya administrasi / operasional",
        ],
      };
    case "RETAIL":
      return {
        mode: "retail-sales",
        label: unitType || "Unit Retail",
        primaryFlow: "Penjualan produk dan pendapatan operasional unit retail",
        incomeExamples: [
          "Penjualan buku / perlengkapan",
          "Penjualan makanan / minuman",
          "Pendapatan harian unit retail",
        ],
        expenseExamples: [
          "Pembelian stok barang",
          "Biaya operasional unit retail",
          "Pengeluaran harian po/penyediaan produk",
        ],
      };
    default:
      return {
        mode: "general",
        label: "Umum",
        primaryFlow: "Transaksi umum lembaga atau unit non-retail",
        incomeExamples: ["Pemasukan umum", "Pendapatan lembaga"],
        expenseExamples: ["Pengeluaran umum", "Biaya operasional"],
      };
  }
}

export function getBusinessPrompt(
  unitType?: UnitType,
  transactionType?: "INCOME" | "EXPENSE",
  isRetail?: boolean,
) {
  const profile = getUnitBusinessProfile(unitType, isRetail);
  const keyExamples =
    transactionType === "EXPENSE"
      ? profile.expenseExamples
      : profile.incomeExamples;

  return {
    title: profile.primaryFlow,
    examples: keyExamples,
  };
}

export function getDefaultCategorySuggestions(
  unitType?: UnitType,
  isRetail?: boolean,
  transactionType?: "INCOME" | "EXPENSE" | "TRANSFER",
): string[] {
  const profile = getUnitBusinessProfile(unitType, isRetail);
  const suggestions =
    transactionType === "EXPENSE"
      ? profile.expenseExamples
      : profile.incomeExamples;

  return suggestions.length > 0 ? suggestions : ["Transaksi umum"];
}

export function validateBusinessFlow({
  unitType,
  isRetail,
  transactionType,
  description,
}: {
  unitType?: UnitType;
  isRetail?: boolean;
  transactionType?: "INCOME" | "EXPENSE" | "TRANSFER";
  description?: string;
}): { valid: boolean; reason?: string; expectedExamples: string[] } {
  const scope = getOperationalScope(isRetail, unitType);
  const normalized = (description ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  const kpakIncome = [
    "tabungan",
    "setoran",
    "pendaftaran",
    "daftar ulang",
    "spp",
    "her",
    "keuangan internal",
  ];
  const kpakExpense = [
    "tarik tabungan",
    "tarik",
    "pengeluaran internal",
    "biaya administrasi",
    "operasional",
    "pembayaran",
  ];
  const retailIncome = [
    "penjualan",
    "jual",
    "barang",
    "makanan",
    "minuman",
    "buku",
  ];
  const retailExpense = [
    "stok",
    "pembelian",
    "beli",
    "persediaan",
    "operasional",
    "suplai",
  ];

  if (scope === "KPAK") {
    const expectedExamples =
      transactionType === "EXPENSE" ? kpakExpense : kpakIncome;
    const valid = expectedExamples.some((keyword) =>
      normalized.includes(keyword.toLowerCase()),
    );

    return {
      valid,
      reason: valid
        ? undefined
        : `Transaksi ${transactionType === "EXPENSE" ? "pengeluaran" : "pemasukan"} unit KPAK harus mencerminkan alur operasional KPAK seperti: ${expectedExamples.join(", ")}.`,
      expectedExamples,
    };
  }

  if (scope === "RETAIL") {
    const expectedExamples =
      transactionType === "EXPENSE" ? retailExpense : retailIncome;
    const valid = expectedExamples.some((keyword) =>
      normalized.includes(keyword.toLowerCase()),
    );

    return {
      valid,
      reason: valid
        ? undefined
        : `Transaksi ${transactionType === "EXPENSE" ? "pengeluaran" : "pemasukan"} unit retail harus mencerminkan alur penjualan atau belanja stok seperti: ${expectedExamples.join(", ")}.`,
      expectedExamples,
    };
  }

  return {
    valid: true,
    expectedExamples: ["Transaksi umum"],
  };
}
