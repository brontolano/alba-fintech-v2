import bcrypt from "bcryptjs";
import type { PrismaClient } from "../generated/prisma/client";
import {
  mkdir,
  readFile,
  readdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const DEMO_PASSWORD = "bismillah";

const DEFAULT_SETTINGS = [
  ["app_name", "ALBA Finance", "Nama aplikasi"],
  [
    "app_description",
    "Sistem Manajemen Keuangan Pondok Pesantren",
    "Deskripsi aplikasi",
  ],
  ["currency", "IDR", "Mata uang"],
  ["timezone", "Asia/Jakarta", "Zona waktu"],
  ["theme", "light", "Tema aplikasi"],
  ["primary_color", "#10b981", "Warna utama"],
  ["compact_mode", "false", "Mode kompak"],
  ["email_notifications", "true", "Notifikasi email"],
  ["push_notifications", "true", "Notifikasi push"],
  ["in_app_notifications", "true", "Notifikasi dalam aplikasi"],
  ["reminders", "true", "Pengingat"],
  ["session_timeout", "1800", "Timeout sesi"],
  ["enable_2fa", "false", "Autentikasi dua faktor"],
] as const;

const UNITS = [
  {
    name: "KPAK",
    code: "KPK-01",
    type: "KPAK" as const,
    isRetail: false,
    description: "Kantor Pelayanan Administrasi Keuangan",
  },
  {
    name: "Kantin Baru",
    code: "KNT-02",
    type: "KANTIN" as const,
    isRetail: true,
    description: "Kantin makanan dan jajanan baru",
  },
  {
    name: "Kantin Umi",
    code: "KNT-01",
    type: "KANTIN" as const,
    isRetail: true,
    description: "Kantin makanan dan jajanan",
  },
  {
    name: "Koperasi Buku",
    code: "KOP-01",
    type: "KOPERASI" as const,
    isRetail: true,
    description: "Koperasi buku dan perlengkapan sekolah",
  },
];

const CATEGORIES = [
  ["Setoran Unit", "INC-SETOR", "INCOME"],
  ["Penjualan Unit Retail", "INC-PENJUALAN", "INCOME"],
  ["Pemasukan Lembaga", "INC-LEMBAGA", "INCOME"],
  ["Donasi & Bantuan", "INC-DONASI", "INCOME"],
  ["Biaya Operasional", "EXP-OPR", "EXPENSE"],
  ["Pembelian Stok", "EXP-STOK", "EXPENSE"],
  ["Gaji & Honor", "EXP-HONOR", "EXPENSE"],
  ["Listrik, Air & Utility", "EXP-UTIL", "EXPENSE"],
] as const;

const DEMO_USERS = [
  ["pimpinan@alba.app", "Ust. Ahmad (Pimpinan)", "PIMPINAN", null],
  ["manager.kpak@alba.app", "Ali (Manager KPAK)", "MANAGER", "KPK-01"],
  [
    "manager.kantinbaru@alba.app",
    "Eka (Manager Kantin Baru)",
    "MANAGER",
    "KNT-02",
  ],
  [
    "manager.kantinumi@alba.app",
    "Diana (Manager Kantin Umi)",
    "MANAGER",
    "KNT-01",
  ],
  [
    "manager.koperasi@alba.app",
    "Budi (Manager Koperasi Buku)",
    "MANAGER",
    "KOP-01",
  ],
  ["staff.kpak@alba.app", "Firman (Staff KPAK)", "STAFF", "KPK-01"],
  ["staff.kantinbaru@alba.app", "Gita (Staff Kantin Baru)", "STAFF", "KNT-02"],
  ["staff.kantinumi@alba.app", "Hana (Staff Kantin Umi)", "STAFF", "KNT-01"],
  ["staff.koperasi@alba.app", "Indra (Staff Koperasi Buku)", "STAFF", "KOP-01"],
] as const;

const INVENTORY = [
  ["KNT-02", "Nasi Uduk", "DEMO-NU-KNT02", "Makanan", 80, 10, 12000, 8000],
  ["KNT-02", "Es Campur", "DEMO-EC-KNT02", "Minuman", 120, 20, 10000, 6000],
  ["KNT-02", "Ayam Geprek", "DEMO-AG-KNT02", "Makanan", 60, 8, 15000, 9500],
  ["KNT-01", "Nasi Goreng", "DEMO-NG-KNT01", "Makanan", 100, 10, 15000, 10000],
  ["KNT-01", "Es Teh Manis", "DEMO-ET-KNT01", "Minuman", 150, 20, 8000, 5000],
  ["KNT-01", "Mie Goreng", "DEMO-MG-KNT01", "Makanan", 90, 12, 12000, 7500],
  ["KNT-01", "Kopi Susu", "DEMO-KS-KNT01", "Minuman", 110, 15, 10000, 6500],
  ["KOP-01", "Buku Tulis", "DEMO-BT-KOP01", "Alat Tulis", 300, 50, 5000, 3000],
  ["KOP-01", "Pensil 2B", "DEMO-P2B-KOP01", "Alat Tulis", 200, 30, 3000, 1500],
  ["KOP-01", "Bolpoin", "DEMO-BP-KOP01", "Alat Tulis", 250, 40, 3000, 1800],
  ["KOP-01", "Penggaris", "DEMO-PG-KOP01", "Alat Tulis", 150, 25, 4000, 2500],
];

const SAVINGS = [
  {
    studentNumber: "DEMO-S-1001",
    name: "Muhammad Rizki (Demo)",
    className: "X-A",
    cardUid: "DEMO-CARD-001",
    transactions: [
      ["DEPOSIT", 100000, 12],
      ["DEPOSIT", 150000, 7],
      ["WITHDRAWAL", 50000, 3],
      ["DEPOSIT", 100000, 1],
    ],
  },
  {
    studentNumber: "DEMO-S-1002",
    name: "Ahmad Fauzi (Demo)",
    className: "XI-B",
    cardUid: "DEMO-CARD-002",
    transactions: [
      ["DEPOSIT", 250000, 12],
      ["DEPOSIT", 100000, 5],
      ["WITHDRAWAL", 75000, 2],
    ],
  },
  {
    studentNumber: "DEMO-S-1003",
    name: "Siti Nurhaliza (Demo)",
    className: "X-C",
    cardUid: "DEMO-CARD-003",
    transactions: [
      ["DEPOSIT", 50000, 10],
      ["DEPOSIT", 50000, 6],
      ["DEPOSIT", 100000, 1],
    ],
  },
  {
    studentNumber: "DEMO-S-1004",
    name: "Fatimah Azzahra (Demo)",
    className: "XII-A",
    cardUid: "DEMO-CARD-004",
    transactions: [
      ["DEPOSIT", 300000, 15],
      ["WITHDRAWAL", 100000, 4],
    ],
  },
] as const;

const DATA_MODELS = [
  "notification",
  "broadcastRecipient",
  "approval",
  "posSession",
  "shiftSession",
  "shiftAttendance",
  "shiftReport",
  "cashHandover",
  "budgetAllocation",
  "consignmentOwner",
  "consignmentItem",
  "stockBatch",
  "stockBatchItem",
  "stockCount",
  "purchaseRequest",
  "purchaseRequestItem",
  "purchaseItem",
  "consignmentPayout",
  "orderItem",
  "transaction",
  "financialNote",
  "broadcastMessage",
  "inventoryItem",
  "savingsTransaction",
  "savingsAccount",
  "student",
  "bankAccount",
  "audit_logs",
  "push_subscriptions",
  "systemSetting",
  "unitSetting",
  "financialCategory",
  "user",
  "unit",
  "lembaga",
] as const;

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function todayAt(hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function daysAgoAt(days: number, hour: number, minute = 0) {
  const date = dateDaysAgo(days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function jsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => {
      if (typeof current === "bigint") return current.toString();
      if (
        current &&
        typeof current === "object" &&
        typeof current.toNumber === "function"
      )
        return current.toNumber();
      return current;
    }),
  );
}

export async function exportDatabase(prisma: PrismaClient) {
  const result: {
    version: number;
    exportedAt: string;
    data: Record<string, unknown>;
  } = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {},
  };
  for (const model of DATA_MODELS) {
    const delegate = (prisma as any)[model];
    if (delegate) result.data[model] = jsonSafe(await delegate.findMany());
  }
  return result;
}

export async function createServerBackup(prisma: PrismaClient) {
  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 14);
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error(
      "BACKUP_RETENTION_DAYS harus berupa bilangan bulat minimal 1",
    );
  }

  const directory = path.resolve(process.env.BACKUP_DIRECTORY || "backups");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(directory, `alba-backup-${stamp}.json`);
  const backup = await exportDatabase(prisma);
  await writeFile(filePath, JSON.stringify(backup), {
    encoding: "utf8",
    mode: 0o600,
  });

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const scriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  let remote: unknown = null;
  if (scriptUrl || scriptSecret) {
    if (!scriptUrl || !scriptSecret) {
      throw new Error(
        "GOOGLE_APPS_SCRIPT_URL dan GOOGLE_APPS_SCRIPT_SECRET harus diisi bersama",
      );
    }
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: scriptSecret,
        fileName: path.basename(filePath),
        contentBase64: (await readFile(filePath)).toString("base64"),
        source: "alba-fintech",
      }),
      signal: AbortSignal.timeout(30000),
    });
    remote = await response.json();
    if (!response.ok || !(remote as { ok?: boolean }).ok) {
      throw new Error(
        (remote as { error?: string }).error ||
          `Google Apps Script HTTP ${response.status}`,
      );
    }
  }

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    files
      .filter(
        (file) =>
          file.isFile() &&
          file.name.startsWith("alba-backup-") &&
          file.name.endsWith(".json"),
      )
      .map(async (file) => {
        const candidate = path.join(directory, file.name);
        if ((await stat(candidate)).mtimeMs < cutoff) await unlink(candidate);
      }),
  );

  return {
    message: "Backup database berhasil disimpan di server",
    fileName: path.basename(filePath),
    remote,
    retentionDays,
  };
}

async function clearAllData(tx: any, preserveSuperadmins: boolean) {
  await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    await tx.savingsTransaction.deleteMany({});
    await tx.savingsAccount.deleteMany({});
    await tx.student.deleteMany({});
    await tx.notification.deleteMany({});
    await tx.broadcastRecipient.deleteMany({});
    await tx.approval.deleteMany({});
    await tx.purchaseRequestItem.deleteMany({});
    await tx.purchaseItem.deleteMany({});
    await tx.stockBatchItem.deleteMany({});
    await tx.consignmentItem.deleteMany({});
    await tx.consignmentPayout.deleteMany({});
    await tx.stockCount.deleteMany({});
    await tx.consignmentOwner.deleteMany({});
    await tx.stockBatch.deleteMany({});
    await tx.purchaseRequest.deleteMany({});
    await tx.budgetAllocation.deleteMany({});
    await tx.cashHandover.deleteMany({});
    await tx.shiftReport.deleteMany({});
    await tx.shiftAttendance.deleteMany({});
    await tx.shiftSession.deleteMany({});
    await tx.transaction.deleteMany({});
    await tx.orderItem.deleteMany({});
    await tx.posSession.deleteMany({});
    await tx.financialNote.deleteMany({});
    await tx.broadcastMessage.deleteMany({});
    await tx.inventoryItem.deleteMany({});
    await tx.bankAccount.deleteMany({});
    await tx.audit_logs.deleteMany({});
    await tx.push_subscriptions.deleteMany({});
    await tx.systemSetting.deleteMany({});
    await tx.unitSetting.deleteMany({});
    await tx.financialCategory.deleteMany({});
    if (preserveSuperadmins) {
      await tx.user.updateMany({
        where: { role: "SUPERADMIN" },
        data: { unitId: null, lembagaId: null },
      });
      await tx.user.deleteMany({ where: { role: { not: "SUPERADMIN" } } });
    } else {
      await tx.user.deleteMany({});
    }
    await tx.unit.deleteMany({});
    await tx.lembaga.deleteMany({});
  } finally {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}

export async function resetDatabase(prisma: PrismaClient) {
  return prisma.$transaction(
    async (tx) => {
      await clearAllData(tx, true);
      return {
        message: "Semua data berhasil direset. Akun SUPERADMIN dipertahankan.",
      };
    },
    { timeout: 30000 },
  );
}

export async function seedDemoData(prisma: PrismaClient) {
  return prisma.$transaction(
    async (tx) => {
      await clearAllData(tx, true);

      const lembaga = await tx.lembaga.create({
        data: {
          name: "Pondok Pesantren Al-Basyariyah",
          code: "AL-BASYARIYAH",
          description: "Data demo untuk edukasi pengelolaan keuangan pesantren",
          address: "Jl. Mahmud, Rahayu, Margaasih, Bandung",
        },
      });

      const units = new Map<string, any>();
      for (const unitData of UNITS) {
        const unit = await tx.unit.create({
          data: { ...unitData, lembagaId: lembaga.id },
        });
        units.set(unit.code, unit);
        await tx.unitSetting.create({
          data: {
            unitId: unit.id,
            posEnabled: unit.isRetail,
            inventoryEnabled: unit.isRetail,
            requiresApproval: false,
          },
        });
      }

      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
      const superadmins = await tx.user.findMany({
        where: { role: "SUPERADMIN" },
      });
      for (const user of superadmins) {
        await tx.user.update({
          where: { id: user.id },
          data: { lembagaId: lembaga.id, isActive: true },
        });
      }

      const users = new Map<string, any>();
      for (const [email, name, role, unitCode] of DEMO_USERS) {
        const user = await tx.user.create({
          data: {
            email,
            name,
            role: role as any,
            passwordHash: hashedPassword,
            lembagaId: lembaga.id,
            unitId: unitCode ? units.get(unitCode).id : null,
          },
        });
        users.set(email, user);
      }
      const pimpinan = users.get("pimpinan@alba.app");
      const managerKpak = users.get("manager.kpak@alba.app");
      const managerKantinBaru = users.get("manager.kantinbaru@alba.app");
      const managerKantinUmi = users.get("manager.kantinumi@alba.app");
      const managerKoperasi = users.get("manager.koperasi@alba.app");
      const staffKpak = users.get("staff.kpak@alba.app");
      const staffKantinBaru = users.get("staff.kantinbaru@alba.app");
      const staffKantinUmi = users.get("staff.kantinumi@alba.app");
      const staffKoperasi = users.get("staff.koperasi@alba.app");

      const categories = new Map<string, any>();
      for (const [name, code, type] of CATEGORIES) {
        const category = await tx.financialCategory.create({
          data: { name, code, type: type as any, lembagaId: lembaga.id },
        });
        categories.set(code, category);
      }

      const accounts = new Map<string, any>();
      for (const [code, unitCode, name, type, balance] of [
        ["DEMO-KPK-KAS", "KPK-01", "Kas KPAK", "CASH", 62000000],
        ["DEMO-KNT02-KAS", "KNT-02", "Kas Kantin Baru", "CASH", 3200000],
        ["DEMO-KNT01-KAS", "KNT-01", "Kas Kantin Umi", "CASH", 2500000],
        ["DEMO-KOP-KAS", "KOP-01", "Kas Koperasi Buku", "CASH", 8500000],
      ] as const) {
        accounts.set(
          unitCode,
          await tx.bankAccount.create({
            data: {
              code,
              name,
              type: type as any,
              balance,
              unitId: units.get(unitCode).id,
            },
          }),
        );
      }

      const transactions = [
        [
          "KPK-01",
          "manager.kpak@alba.app",
          "INC-SETOR",
          "INCOME",
          12000000,
          "Setoran kas harian KPAK dari unit administrasi",
          "APPROVED",
          1,
        ],
        [
          "KPK-01",
          "manager.kpak@alba.app",
          "EXP-UTIL",
          "EXPENSE",
          2500000,
          "Pembayaran listrik dan air kantor KPAK",
          "PENDING",
          0,
        ],
        [
          "KPK-01",
          "manager.kpak@alba.app",
          "INC-LEMBAGA",
          "INCOME",
          4950000,
          "Iuran operasional santri lembaga periode bulan ini",
          "APPROVED",
          2,
        ],
        [
          "KPK-01",
          "manager.kpak@alba.app",
          "EXP-HONOR",
          "EXPENSE",
          3500000,
          "Honorarium ustadz pengajar bulan ini",
          "APPROVED",
          4,
        ],
        [
          "KPK-01",
          "manager.kpak@alba.app",
          "EXP-OPR",
          "EXPENSE",
          750000,
          "ATK dan konsumsi rapat bulanan KPAK",
          "REJECTED",
          3,
        ],
        [
          "KPK-01",
          "manager.kpak@alba.app",
          "TRANSFER",
          "TRANSFER",
          500000,
          "Transfer kas KPAK ke Kantin Umi untuk modal operasional",
          "APPROVED",
          1,
        ],
        [
          "KNT-02",
          "staff.kantinbaru@alba.app",
          "EXP-STOK",
          "EXPENSE",
          220000,
          "Pembelian stok bahan baku dan minuman",
          "PENDING",
          0,
        ],
        [
          "KNT-02",
          "manager.kantinbaru@alba.app",
          "INC-PENJUALAN",
          "INCOME",
          680000,
          "Penjualan harian menu siang Kantin Baru",
          "APPROVED",
          1,
        ],
        [
          "KNT-02",
          "staff.kantinbaru@alba.app",
          "INC-PENJUALAN",
          "INCOME",
          180000,
          "Catatan penjualan sarapan yang belum dilengkapi bukti",
          "DRAFT",
          0,
        ],
        [
          "KNT-01",
          "staff.kantinumi@alba.app",
          "EXP-STOK",
          "EXPENSE",
          180000,
          "Pembelian bahan baku masakan hari ini",
          "PENDING",
          0,
        ],
        [
          "KNT-01",
          "manager.kantinumi@alba.app",
          "INC-PENJUALAN",
          "INCOME",
          510000,
          "Penjualan paket makan siang Kantin Umi",
          "APPROVED",
          2,
        ],
        [
          "KOP-01",
          "staff.koperasi@alba.app",
          "EXP-STOK",
          "EXPENSE",
          300000,
          "Pembelian stok buku dan alat tulis baru",
          "PENDING",
          0,
        ],
        [
          "KOP-01",
          "manager.koperasi@alba.app",
          "INC-PENJUALAN",
          "INCOME",
          750000,
          "Penjualan buku pelajaran dan perlengkapan sekolah",
          "APPROVED",
          1,
        ],
        [
          "KOP-01",
          "staff.koperasi@alba.app",
          "EXP-OPR",
          "EXPENSE",
          45000,
          "Penggantian kantong plastik dan tali kemasan",
          "APPROVED",
          0,
        ],
        [
          "KOP-01",
          "manager.koperasi@alba.app",
          "INC-SETOR",
          "INCOME",
          900000,
          "Setoran kas dari penjualan buku dan admin koperasi",
          "APPROVED",
          1,
        ],
      ] as const;
      const unitManagerEmail: Record<string, string> = {
        "KPK-01": "manager.kpak@alba.app",
        "KNT-02": "manager.kantinbaru@alba.app",
        "KNT-01": "manager.kantinumi@alba.app",
        "KOP-01": "manager.koperasi@alba.app",
      };
      for (const [
        transactionIndex,
        [
          unitCode,
          email,
          categoryCode,
          type,
          amount,
          description,
          status,
          days,
        ],
      ] of transactions.entries()) {
        const creator = users.get(email);
        const transaction = await tx.transaction.create({
          data: {
            unitId: units.get(unitCode).id,
            type: type as any,
            amount,
            description: `[DEMO] ${description}`,
            reference: `DEMO-${unitCode}-${String(transactionIndex + 1).padStart(
              2,
              "0",
            )}`,
            status: status as any,
            createdById: creator.id,
            categoryId:
              categoryCode === "TRANSFER"
                ? null
                : categories.get(categoryCode).id,
            accountId: accounts.get(unitCode).id,
            approvedById:
              status === "APPROVED" || status === "REJECTED"
                ? creator.id
                : null,
            approvedAt:
              status === "APPROVED" || status === "REJECTED"
                ? dateDaysAgo(Math.max(days, 1))
                : null,
            isReconciled: status === "APPROVED",
            reconciledAt:
              status === "APPROVED" ? dateDaysAgo(Math.max(days, 1)) : null,
            date: dateDaysAgo(days),
          },
        });
        if (status === "PENDING" || status === "REJECTED") {
          const approver =
            creator.role === "STAFF"
              ? users.get(unitManagerEmail[unitCode])
              : pimpinan;
          await tx.approval.create({
            data: {
              transactionId: transaction.id,
              unitId: transaction.unitId,
              approverId: approver.id,
              status: status as any,
              comment:
                status === "REJECTED"
                  ? "Bukti pendukung belum lengkap, silakan dilengkapi dan ajukan ulang"
                  : null,
            },
          });
        }
      }

      const inventoryItems = new Map<string, any>();
      for (const [
        unitCode,
        name,
        sku,
        category,
        stock,
        minStock,
        unitPrice,
        purchasePrice,
      ] of INVENTORY as [
        string,
        string,
        string,
        string,
        number,
        number,
        number,
        number,
      ][]) {
        const inventoryItem = await tx.inventoryItem.create({
          data: {
            unitId: units.get(unitCode).id,
            name,
            sku,
            category,
            currentStock: stock,
            minStock,
            unitPrice,
            purchasePrice,
          },
        });
        inventoryItems.set(sku, inventoryItem);
      }

      const kpakUnit = units.get("KPK-01");
      for (const studentData of SAVINGS) {
        const student = await tx.student.create({
          data: {
            studentNumber: studentData.studentNumber,
            name: studentData.name,
            className: studentData.className,
            cardUid: studentData.cardUid,
            lembagaId: lembaga.id,
            unitId: kpakUnit.id,
          },
        });
        let balance = 0;
        const savingsAccount = await tx.savingsAccount.create({
          data: {
            studentId: student.id,
            unitId: kpakUnit.id,
            balance: 0,
          },
        });
        for (const [type, amount, days] of studentData.transactions) {
          const before = balance;
          balance = type === "DEPOSIT" ? balance + amount : balance - amount;
          await tx.savingsTransaction.create({
            data: {
              accountId: savingsAccount.id,
              unitId: kpakUnit.id,
              type: type as any,
              amount,
              balanceBefore: before,
              balanceAfter: balance,
              reference: `DEMO-${
                type === "DEPOSIT" ? "SETORAN" : "PENARIKAN"
              }`,
              description: `[DEMO] ${
                type === "DEPOSIT"
                  ? `Setoran tabungan ${studentData.name}`
                  : `Penarikan tabungan ${studentData.name}`
              }`,
              cardUid: studentData.cardUid,
              createdById: managerKpak.id,
              createdAt: dateDaysAgo(days),
            },
          });
        }
        await tx.savingsAccount.update({
          where: { id: savingsAccount.id },
          data: { balance },
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthPrefix = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, "0")}`;
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const addOrderItems = async (
        transactionId: string,
        rows: [string, string, number, number][],
      ) => {
        for (const [sku, itemName, quantity, unitPrice] of rows) {
          await tx.orderItem.create({
            data: {
              transactionId,
              itemId: inventoryItems.get(sku).id,
              itemName,
              quantity,
              unitPrice,
              totalPrice: quantity * unitPrice,
            },
          });
        }
      };

      const closedPosKnt02 = await tx.posSession.create({
        data: {
          unitId: units.get("KNT-02").id,
          userId: staffKantinBaru.id,
          date: dateDaysAgo(1),
          openedAt: daysAgoAt(1, 6, 30),
          openingCash: 300000,
          closedAt: daysAgoAt(1, 14, 45),
          expectedCash: 680000,
          countedCash: 680000,
          discrepancy: 0,
          closeNote: "Penutupan shift siang sesuai hitungan kasir",
        },
      });
      const closedPosSaleKnt02 = await tx.transaction.create({
        data: {
          unitId: units.get("KNT-02").id,
          type: "INCOME",
          amount: 380000,
          description: "[DEMO] Penjualan shift pagi Kantin Baru",
          reference: "DEMO-POS-KNT02-01",
          status: "APPROVED",
          createdById: staffKantinBaru.id,
          categoryId: categories.get("INC-PENJUALAN").id,
          accountId: accounts.get("KNT-02").id,
          approvedById: managerKantinBaru.id,
          approvedAt: daysAgoAt(1, 15, 0),
          date: daysAgoAt(1, 10, 15),
          posSessionId: closedPosKnt02.id,
        },
      });
      await addOrderItems(closedPosSaleKnt02.id, [
        ["DEMO-NU-KNT02", "Nasi Uduk", 15, 12000],
        ["DEMO-EC-KNT02", "Es Campur", 20, 10000],
      ]);

      const closedPosKnt01 = await tx.posSession.create({
        data: {
          unitId: units.get("KNT-01").id,
          userId: managerKantinUmi.id,
          date: dateDaysAgo(1),
          openedAt: daysAgoAt(1, 6, 30),
          openingCash: 250000,
          closedAt: daysAgoAt(1, 14, 0),
          expectedCash: 240000,
          countedCash: 240000,
          discrepancy: 0,
          closeNote: "Penutupan shift siang Kantin Umi",
        },
      });
      const closedPosSaleKnt01 = await tx.transaction.create({
        data: {
          unitId: units.get("KNT-01").id,
          type: "INCOME",
          amount: 240000,
          description: "[DEMO] Penjualan shift pagi Kantin Umi",
          reference: "DEMO-POS-KNT01-02",
          status: "APPROVED",
          createdById: managerKantinUmi.id,
          categoryId: categories.get("INC-PENJUALAN").id,
          accountId: accounts.get("KNT-01").id,
          approvedById: managerKantinUmi.id,
          approvedAt: daysAgoAt(1, 15, 0),
          date: daysAgoAt(1, 11, 0),
          posSessionId: closedPosKnt01.id,
        },
      });
      await addOrderItems(closedPosSaleKnt01.id, [
        ["DEMO-NG-KNT01", "Nasi Goreng", 10, 15000],
        ["DEMO-ET-KNT01", "Es Teh Manis", 5, 8000],
        ["DEMO-KS-KNT01", "Kopi Susu", 5, 10000],
      ]);

      const closedPosKop01 = await tx.posSession.create({
        data: {
          unitId: units.get("KOP-01").id,
          userId: managerKoperasi.id,
          date: dateDaysAgo(1),
          openedAt: daysAgoAt(1, 8, 0),
          openingCash: 200000,
          closedAt: daysAgoAt(1, 15, 0),
          expectedCash: 180000,
          countedCash: 180000,
          discrepancy: 0,
          closeNote: "Penutupan shift koperasi",
        },
      });
      const closedPosSaleKop01 = await tx.transaction.create({
        data: {
          unitId: units.get("KOP-01").id,
          type: "INCOME",
          amount: 180000,
          description: "[DEMO] Penjualan shift koperasi kemarin",
          reference: "DEMO-POS-KOP01-02",
          status: "APPROVED",
          createdById: managerKoperasi.id,
          categoryId: categories.get("INC-PENJUALAN").id,
          accountId: accounts.get("KOP-01").id,
          approvedById: managerKoperasi.id,
          approvedAt: daysAgoAt(1, 16, 0),
          date: daysAgoAt(1, 10, 30),
          posSessionId: closedPosKop01.id,
        },
      });
      await addOrderItems(closedPosSaleKop01.id, [
        ["DEMO-BT-KOP01", "Buku Tulis", 24, 5000],
        ["DEMO-P2B-KOP01", "Pensil 2B", 20, 3000],
      ]);

      const openPosKnt02 = await tx.posSession.create({
        data: {
          unitId: units.get("KNT-02").id,
          userId: staffKantinBaru.id,
          date: today,
          openedAt: todayAt(6, 30),
          openingCash: 300000,
        },
      });
      const todaySaleKnt02 = await tx.transaction.create({
        data: {
          unitId: units.get("KNT-02").id,
          type: "INCOME",
          amount: 150000,
          description: "[DEMO] Penjualan sarapan Kantin Baru",
          reference: "DEMO-POS-KNT02-02",
          status: "APPROVED",
          createdById: staffKantinBaru.id,
          categoryId: categories.get("INC-PENJUALAN").id,
          accountId: accounts.get("KNT-02").id,
          approvedById: managerKantinBaru.id,
          approvedAt: todayAt(8, 0),
          date: todayAt(7, 45),
          posSessionId: openPosKnt02.id,
        },
      });
      await addOrderItems(todaySaleKnt02.id, [
        ["DEMO-NU-KNT02", "Nasi Uduk", 10, 12000],
        ["DEMO-EC-KNT02", "Es Campur", 3, 10000],
      ]);

      const openPosKnt01 = await tx.posSession.create({
        data: {
          unitId: units.get("KNT-01").id,
          userId: managerKantinUmi.id,
          date: today,
          openedAt: todayAt(6, 30),
          openingCash: 250000,
        },
      });
      const todaySaleKnt01 = await tx.transaction.create({
        data: {
          unitId: units.get("KNT-01").id,
          type: "INCOME",
          amount: 190000,
          description: "[DEMO] Penjualan makan siang Kantin Umi",
          reference: "DEMO-POS-KNT01-01",
          status: "APPROVED",
          createdById: managerKantinUmi.id,
          categoryId: categories.get("INC-PENJUALAN").id,
          accountId: accounts.get("KNT-01").id,
          approvedById: managerKantinUmi.id,
          approvedAt: todayAt(12, 0),
          date: todayAt(11, 45),
          posSessionId: openPosKnt01.id,
        },
      });
      await addOrderItems(todaySaleKnt01.id, [
        ["DEMO-NG-KNT01", "Nasi Goreng", 10, 15000],
        ["DEMO-ET-KNT01", "Es Teh Manis", 5, 8000],
      ]);

      const openPosKop01 = await tx.posSession.create({
        data: {
          unitId: units.get("KOP-01").id,
          userId: managerKoperasi.id,
          date: today,
          openedAt: todayAt(8, 0),
          openingCash: 200000,
        },
      });
      const todaySaleKop01 = await tx.transaction.create({
        data: {
          unitId: units.get("KOP-01").id,
          type: "INCOME",
          amount: 160000,
          description: "[DEMO] Penjualan buku dan alat tulis",
          reference: "DEMO-POS-KOP01-01",
          status: "APPROVED",
          createdById: managerKoperasi.id,
          categoryId: categories.get("INC-PENJUALAN").id,
          accountId: accounts.get("KOP-01").id,
          approvedById: managerKoperasi.id,
          approvedAt: todayAt(9, 0),
          date: todayAt(8, 45),
          posSessionId: openPosKop01.id,
        },
      });
      await addOrderItems(todaySaleKop01.id, [
        ["DEMO-BT-KOP01", "Buku Tulis", 20, 5000],
        ["DEMO-P2B-KOP01", "Pensil 2B", 20, 3000],
      ]);

      await tx.cashHandover.create({
        data: {
          unitId: units.get("KNT-02").id,
          date: dateDaysAgo(1),
          totalIncome: 380000,
          totalExpense: 0,
          systemBalance: 380000,
          cashHanded: 380000,
          variance: 0,
          status: "ACCEPTED",
          submittedById: managerKantinBaru.id,
          submittedAt: daysAgoAt(1, 15, 0),
          acceptedById: pimpinan.id,
          acceptedAt: daysAgoAt(1, 16, 0),
          note: "Diterima dan dicocokkan oleh pimpinan",
        },
      });
      await tx.cashHandover.create({
        data: {
          unitId: units.get("KNT-02").id,
          date: today,
          totalIncome: 150000,
          totalExpense: 0,
          systemBalance: 150000,
          cashHanded: 150000,
          variance: 0,
          status: "PENDING",
          submittedById: managerKantinBaru.id,
          submittedAt: todayAt(14, 30),
        },
      });
      await tx.cashHandover.create({
        data: {
          unitId: units.get("KNT-01").id,
          date: today,
          totalIncome: 190000,
          totalExpense: 0,
          systemBalance: 190000,
          cashHanded: 190000,
          variance: 0,
          status: "PENDING",
          submittedById: managerKantinUmi.id,
          submittedAt: todayAt(14, 30),
        },
      });
      await tx.cashHandover.create({
        data: {
          unitId: units.get("KOP-01").id,
          date: today,
          totalIncome: 160000,
          totalExpense: 0,
          systemBalance: 160000,
          cashHanded: 160000,
          variance: 0,
          status: "PENDING",
          submittedById: managerKoperasi.id,
          submittedAt: todayAt(14, 30),
        },
      });

      await tx.financialNote.create({
        data: {
          unitId: null,
          title: "Donasi Bantuan Operasional Santri",
          description:
            "[DEMO] Pemasukan lembaga dari donasi untuk bantuan operasional santri",
          amount: 1500000,
          type: "INCOME",
          date: daysAgoAt(2, 9, 0),
          categoryId: categories.get("INC-LEMBAGA").id,
          createdById: pimpinan.id,
          approvedById: pimpinan.id,
          approvedAt: daysAgoAt(2, 9, 5),
          isReconciled: true,
          reconciledAt: daysAgoAt(2, 9, 10),
          reconciledById: pimpinan.id,
        },
      });
      await tx.financialNote.create({
        data: {
          unitId: null,
          title: "Kegiatan Sosial Bulanan",
          description: "[DEMO] Pengeluaran lembaga untuk kegiatan sosial pesantren",
          amount: 2500000,
          type: "EXPENSE",
          date: dateDaysAgo(3),
          categoryId: categories.get("EXP-OPR").id,
          createdById: pimpinan.id,
          approvedById: pimpinan.id,
          approvedAt: dateDaysAgo(3),
          isReconciled: false,
        },
      });

      const kpakOpsCategory = await tx.financialCategory.create({
        data: {
          name: "Operasional Kantor KPAK",
          code: "EXP-OPR-KPAK",
          type: "EXPENSE",
          lembagaId: lembaga.id,
          unitId: units.get("KPK-01").id,
        },
      });
      await tx.budgetAllocation.create({
        data: {
          unitId: units.get("KPK-01").id,
          categoryId: kpakOpsCategory.id,
          periodType: "MONTHLY",
          period: `M${monthPrefix}`,
          startDate: monthStart,
          endDate: monthEnd,
          amount: 5000000,
          note: "[DEMO] Alokasi operasional bulanan KPAK",
          source: "KPAK",
          isActive: true,
          createdById: managerKpak.id,
        },
      });
      await tx.budgetAllocation.create({
        data: {
          unitId: units.get("KNT-01").id,
          categoryId: categories.get("EXP-STOK").id,
          periodType: "MONTHLY",
          period: `M${monthPrefix}`,
          startDate: monthStart,
          endDate: monthEnd,
          amount: 4000000,
          note: "[DEMO] Alokasi bulanan bahan baku Kantin Umi",
          source: "LEMBAGA",
          isActive: true,
          createdById: pimpinan.id,
        },
      });

      const prRequested = await tx.purchaseRequest.create({
        data: {
          unitId: units.get("KNT-02").id,
          requestNo: "PR-DEMO-001",
          title: "Belanja Bahan Baku Mingguan Kantin Baru",
          note: "[DEMO] Permintaan pembelian stok mingguan",
          status: "REQUESTED",
          estimatedTotal: 450000,
          supplierName: "Pasar Al-Basyariyah",
          supplierPhone: "0812-3456-7890",
          createdById: managerKantinBaru.id,
          createdAt: daysAgoAt(2, 8, 0),
        },
      });
      await tx.purchaseRequestItem.create({
        data: {
          requestId: prRequested.id,
          itemId: inventoryItems.get("DEMO-NU-KNT02").id,
          name: "Nasi Uduk",
          qtyRequested: 50,
          estUnitCost: 8000,
          isNewItem: false,
        },
      });
      await tx.purchaseRequestItem.create({
        data: {
          requestId: prRequested.id,
          itemId: null,
          name: "Saus Sambal (Baru)",
          qtyRequested: 10,
          estUnitCost: 5000,
          isNewItem: true,
        },
      });

      const prReceived = await tx.purchaseRequest.create({
        data: {
          unitId: units.get("KNT-01").id,
          requestNo: "PR-DEMO-003",
          title: "Belanja Bahan Minuman Kantin Umi",
          note: "[DEMO] Permintaan pembelian bahan minuman mingguan",
          status: "RECEIVED",
          estimatedTotal: 355000,
          finalTotal: 355000,
          supplierName: "Toko Sumber Rasa",
          supplierPhone: "0813-9999-1122",
          orderAt: daysAgoAt(3, 9, 0),
          orderById: managerKantinUmi.id,
          receivedAt: daysAgoAt(2, 13, 0),
          receivedById: staffKantinUmi.id,
          receiveNote: "Barang diterima lengkap sesuai nota",
          invoiceNumber: "INV-DEMO-003",
          createdById: managerKantinUmi.id,
          createdAt: daysAgoAt(5, 7, 30),
        },
      });
      await tx.purchaseRequestItem.create({
        data: {
          requestId: prReceived.id,
          itemId: inventoryItems.get("DEMO-MG-KNT01").id,
          name: "Mie Goreng",
          qtyRequested: 30,
          estUnitCost: 7500,
          isNewItem: false,
          qtyReceived: 30,
          unitCost: 7500,
        },
      });
      await tx.purchaseRequestItem.create({
        data: {
          requestId: prReceived.id,
          itemId: inventoryItems.get("DEMO-KS-KNT01").id,
          name: "Kopi Susu",
          qtyRequested: 20,
          estUnitCost: 6500,
          isNewItem: false,
          qtyReceived: 20,
          unitCost: 6500,
        },
      });

      const prPaidTx = await tx.transaction.create({
        data: {
          unitId: units.get("KOP-01").id,
          type: "EXPENSE",
          amount: 444000,
          description: "[DEMO] Pembayaran invoice belanja stok koperasi",
          reference: "DEMO-PR-KOP01",
          status: "APPROVED",
          createdById: managerKoperasi.id,
          categoryId: categories.get("EXP-STOK").id,
          accountId: accounts.get("KOP-01").id,
          approvedById: managerKoperasi.id,
          approvedAt: daysAgoAt(7, 14, 0),
          date: daysAgoAt(7, 13, 30),
        },
      });
      const prPaid = await tx.purchaseRequest.create({
        data: {
          unitId: units.get("KOP-01").id,
          requestNo: "PR-DEMO-002",
          title: "Belanja Buku dan Alat Tulis Koperasi",
          note: "[DEMO] Pembelian rutin buku dan alat tulis untuk santri",
          status: "PAID",
          estimatedTotal: 444000,
          finalTotal: 444000,
          supplierName: "Distributor Buku Al-Basyariyah",
          supplierPhone: "0812-8888-5566",
          orderAt: daysAgoAt(8, 9, 0),
          orderById: managerKoperasi.id,
          receivedAt: daysAgoAt(7, 13, 0),
          receivedById: staffKoperasi.id,
          receiveNote: "Semua barang diterima dalam kondisi baik",
          invoiceNumber: "INV-DEMO-002",
          paidAt: daysAgoAt(7, 13, 30),
          paidById: managerKoperasi.id,
          transactionId: prPaidTx.id,
          createdById: managerKoperasi.id,
          createdAt: daysAgoAt(10, 8, 0),
        },
      });
      await tx.purchaseRequestItem.create({
        data: {
          requestId: prPaid.id,
          itemId: inventoryItems.get("DEMO-BT-KOP01").id,
          name: "Buku Tulis",
          qtyRequested: 100,
          estUnitCost: 3000,
          isNewItem: false,
          qtyReceived: 100,
          unitCost: 3000,
        },
      });
      await tx.purchaseRequestItem.create({
        data: {
          requestId: prPaid.id,
          itemId: inventoryItems.get("DEMO-BP-KOP01").id,
          name: "Bolpoin",
          qtyRequested: 80,
          estUnitCost: 1800,
          isNewItem: false,
          qtyReceived: 80,
          unitCost: 1800,
        },
      });
      for (const [name, itemId, qty, estUnitCost] of [
        ["Buku Tulis", "DEMO-BT-KOP01", 100, 3000],
        ["Bolpoin", "DEMO-BP-KOP01", 80, 1800],
      ] as const) {
        await tx.purchaseItem.create({
          data: {
            unitId: units.get("KOP-01").id,
            transactionId: prPaidTx.id,
            itemId: inventoryItems.get(itemId).id,
            name,
            qty,
            estUnitCost,
            fulfilled: qty,
            status: "FULFILLED",
            note: "[DEMO] Diterima lengkap",
          },
        });
      }

      const prRejected = await tx.purchaseRequest.create({
        data: {
          unitId: units.get("KNT-02").id,
          requestNo: "PR-DEMO-004",
          title: "Belanja Perlengkapan Dapur Kantin Baru",
          note: "[DEMO] Permintaan pembelian perlengkapan dapur",
          status: "REJECTED",
          estimatedTotal: 300000,
          refusedReason:
            "Pengajuan duplikat dengan permintaan minggu ini, silakan digabung",
          createdById: staffKantinBaru.id,
          createdAt: daysAgoAt(1, 10, 0),
        },
      });
      await tx.purchaseRequestItem.create({
        data: {
          requestId: prRejected.id,
          itemId: inventoryItems.get("DEMO-AG-KNT02").id,
          name: "Ayam Geprek",
          qtyRequested: 40,
          estUnitCost: 7500,
          isNewItem: false,
        },
      });

      const consignmentOwner = await tx.consignmentOwner.create({
        data: {
          unitId: units.get("KNT-02").id,
          name: "Toko Barokah",
          phone: "0813-2222-3344",
          whatsappVerified: true,
          address: "Kp. Babakan, Margaasih",
          isActive: true,
        },
      });
      await tx.consignmentItem.create({
        data: {
          unitId: units.get("KNT-02").id,
          ownerId: consignmentOwner.id,
          inventoryItemId: inventoryItems.get("DEMO-EC-KNT02").id,
          marginType: "PERCENT",
          marginValue: 20,
          costPrice: 6000,
          agreedPrice: 10000,
          isActive: true,
        },
      });
      await tx.consignmentPayout.create({
        data: {
          unitId: units.get("KNT-02").id,
          ownerId: consignmentOwner.id,
          amount: 350000,
          fromDate: dateDaysAgo(7),
          toDate: dateDaysAgo(1),
          status: "PENDING",
          note: "[DEMO] Pembayaran konsinyasi minggu lalu",
        },
      });
      const payoutExpense = await tx.transaction.create({
        data: {
          unitId: units.get("KNT-02").id,
          type: "EXPENSE",
          amount: 220000,
          description: "[DEMO] Pembayaran konsinyasi Toko Barokah periode lalu",
          reference: "DEMO-KONS-KNT02-01",
          status: "APPROVED",
          createdById: managerKantinBaru.id,
          categoryId: categories.get("EXP-STOK").id,
          accountId: accounts.get("KNT-02").id,
          approvedById: managerKantinBaru.id,
          approvedAt: daysAgoAt(2, 10, 0),
          date: daysAgoAt(2, 9, 30),
        },
      });
      await tx.consignmentPayout.create({
        data: {
          unitId: units.get("KNT-02").id,
          ownerId: consignmentOwner.id,
          amount: 220000,
          fromDate: dateDaysAgo(14),
          toDate: dateDaysAgo(7),
          status: "PAID",
          transactionId: payoutExpense.id,
          paidById: managerKantinBaru.id,
          note: "[DEMO] Pembayaran konsinyasi periode sebelumnya",
        },
      });

      const stockBatch = await tx.stockBatch.create({
        data: {
          unitId: units.get("KNT-02").id,
          batchNo: "BT-DEMO-001",
          date: daysAgoAt(1, 16, 0),
          kind: "CAMPURAN",
          status: "APPROVED",
          totalQty: 90,
          totalCost: 640000,
          sourceType: "PEMBELIAN",
          sourceRef: "PR-DEMO-001",
          note: "[DEMO] Batch pembelian bahan baku dan barang konsinyasi",
          createdById: managerKantinBaru.id,
          reviewedById: pimpinan.id,
          reviewedAt: dateDaysAgo(1),
          reviewNote: "Data sesuai nota pembelian",
        },
      });
      await tx.stockBatchItem.create({
        data: {
          batchId: stockBatch.id,
          inventoryItemId: inventoryItems.get("DEMO-NU-KNT02").id,
          qty: 50,
          unitCost: 8000,
          lineTotal: 400000,
          ownerId: null,
        },
      });
      await tx.stockBatchItem.create({
        data: {
          batchId: stockBatch.id,
          inventoryItemId: inventoryItems.get("DEMO-EC-KNT02").id,
          qty: 40,
          unitCost: 6000,
          finalUnitCost: 6000,
          lineTotal: 240000,
          ownerId: consignmentOwner.id,
          marginType: "PERCENT",
          marginValue: 20,
        },
      });

      const draftBatch = await tx.stockBatch.create({
        data: {
          unitId: units.get("KNT-01").id,
          batchNo: "BT-KNT01-DEMO-002",
          date: today,
          kind: "CAMPURAN",
          status: "DRAFT",
          totalQty: 50,
          totalCost: 355000,
          sourceType: "PEMBELIAN",
          sourceRef: "PR-DEMO-003",
          note: "[DEMO] Batch draft menunggu review",
          createdById: staffKantinUmi.id,
        },
      });
      await tx.stockBatchItem.create({
        data: {
          batchId: draftBatch.id,
          inventoryItemId: inventoryItems.get("DEMO-MG-KNT01").id,
          qty: 30,
          unitCost: 7500,
          lineTotal: 225000,
          ownerId: null,
        },
      });
      await tx.stockBatchItem.create({
        data: {
          batchId: draftBatch.id,
          inventoryItemId: inventoryItems.get("DEMO-KS-KNT01").id,
          qty: 20,
          unitCost: 6500,
          lineTotal: 130000,
          ownerId: null,
        },
      });

      await tx.stockCount.create({
        data: {
          unitId: units.get("KNT-02").id,
          ownerId: consignmentOwner.id,
          date: today,
          payload: {
            items: [
              { name: "Nasi Uduk", stock: 45 },
              { name: "Es Campur", stock: 30 },
            ],
          },
          totalSold: 12,
          totalHak: 120000,
          status: "DRAFT",
          createdById: staffKantinBaru.id,
        },
      });
      await tx.stockCount.create({
        data: {
          unitId: units.get("KNT-02").id,
          ownerId: consignmentOwner.id,
          date: dateDaysAgo(2),
          payload: {
            items: [
              { name: "Nasi Uduk", stock: 55 },
              { name: "Es Campur", stock: 48 },
            ],
          },
          totalSold: 8,
          totalHak: 60000,
          status: "APPROVED",
          createdById: staffKantinBaru.id,
          reviewedById: managerKantinBaru.id,
          reviewedAt: daysAgoAt(2, 15, 0),
          reviewNote: "Sesuai catatan penjualan",
        },
      });

      await tx.shiftSession.create({
        data: {
          unitId: units.get("KNT-02").id,
          userId: staffKantinBaru.id,
          date: dateDaysAgo(1),
          checkInAt: daysAgoAt(1, 6, 30),
          checkOutAt: daysAgoAt(1, 14, 45),
        },
      });
      await tx.shiftAttendance.create({
        data: {
          unitId: units.get("KNT-02").id,
          userId: staffKantinBaru.id,
          date: dateDaysAgo(1),
          checkInAt: daysAgoAt(1, 6, 30),
          checkOutAt: daysAgoAt(1, 14, 45),
          late: false,
          note: "[DEMO] Shift pagi Kantin Baru kemarin",
        },
      });
      await tx.shiftReport.create({
        data: {
          unitId: units.get("KNT-02").id,
          userId: staffKantinBaru.id,
          date: dateDaysAgo(1),
          cashIncomeCounted: 380000,
          cashExpenseCounted: 0,
          note: "[DEMO] Laporan shift pagi Kantin Baru",
          status: "ACCEPTED",
          submittedAt: daysAgoAt(1, 15, 0),
          reviewedById: managerKantinBaru.id,
          reviewedAt: daysAgoAt(1, 16, 0),
        },
      });

      await tx.shiftSession.create({
        data: {
          unitId: units.get("KNT-02").id,
          userId: staffKantinBaru.id,
          date: today,
          checkInAt: todayAt(6, 30),
          checkOutAt: todayAt(14, 30),
        },
      });
      await tx.shiftAttendance.create({
        data: {
          unitId: units.get("KNT-02").id,
          userId: staffKantinBaru.id,
          date: today,
          checkInAt: todayAt(6, 30),
          checkOutAt: todayAt(14, 30),
          late: false,
          note: "[DEMO] Shift pagi Kantin Baru",
        },
      });
      await tx.shiftReport.create({
        data: {
          unitId: units.get("KNT-02").id,
          userId: staffKantinBaru.id,
          date: today,
          cashIncomeCounted: 150000,
          cashExpenseCounted: 0,
          note: "[DEMO] Laporan shift pagi Kantin Baru",
          status: "SUBMITTED",
          submittedAt: todayAt(14, 30),
        },
      });

      await tx.shiftSession.create({
        data: {
          unitId: units.get("KNT-01").id,
          userId: staffKantinUmi.id,
          date: today,
          checkInAt: todayAt(6, 30),
          checkOutAt: todayAt(14, 30),
        },
      });
      await tx.shiftAttendance.create({
        data: {
          unitId: units.get("KNT-01").id,
          userId: staffKantinUmi.id,
          date: today,
          checkInAt: todayAt(6, 30),
          checkOutAt: todayAt(14, 30),
          late: false,
          note: "[DEMO] Shift pagi Kantin Umi",
        },
      });
      await tx.shiftReport.create({
        data: {
          unitId: units.get("KNT-01").id,
          userId: staffKantinUmi.id,
          date: today,
          cashIncomeCounted: 190000,
          cashExpenseCounted: 0,
          note: "[DEMO] Laporan shift pagi Kantin Umi",
          status: "SUBMITTED",
          submittedAt: todayAt(14, 30),
        },
      });

      await tx.shiftSession.create({
        data: {
          unitId: units.get("KOP-01").id,
          userId: staffKoperasi.id,
          date: today,
          checkInAt: todayAt(8, 0),
          checkOutAt: todayAt(15, 0),
        },
      });
      await tx.shiftAttendance.create({
        data: {
          unitId: units.get("KOP-01").id,
          userId: staffKoperasi.id,
          date: today,
          checkInAt: todayAt(8, 0),
          checkOutAt: todayAt(15, 0),
          late: false,
          note: "[DEMO] Shift koperasi",
        },
      });
      await tx.shiftReport.create({
        data: {
          unitId: units.get("KOP-01").id,
          userId: staffKoperasi.id,
          date: today,
          cashIncomeCounted: 160000,
          cashExpenseCounted: 0,
          note: "[DEMO] Laporan shift koperasi",
          status: "SUBMITTED",
          submittedAt: todayAt(15, 0),
        },
      });

      const broadcastSent = await tx.broadcastMessage.create({
        data: {
          lembagaId: lembaga.id,
          title: "Pengumuman Kegiatan Santri",
          message:
            "Dalam rangka pembinaan santri, kegiatan ekstrakurikuler dilaksanakan setiap sore di halaman Masjid. Diharapkan seluruh pengurus ikut mendampingi.",
          type: "INFO",
          priority: "NORMAL",
          status: "SENT",
          isDraft: false,
          isSent: true,
          sentAt: daysAgoAt(2, 7, 30),
          deliveredTo: 9,
          senderId: pimpinan.id,
        },
      });
      for (const user of users.values()) {
        await tx.broadcastRecipient.create({
          data: {
            broadcastId: broadcastSent.id,
            userId: user.id,
            isRead: user.id !== pimpinan.id,
          },
        });
      }
      await tx.broadcastMessage.create({
        data: {
          lembagaId: lembaga.id,
          title: "Renovasi Ruang Kelas",
          message:
            "Rencana renovasi ruang kelas akan dibahas pada rapat bulanan. Mohon pendapat dan usulan disampaikan sebelum rapat dimulai.",
          type: "INFO",
          priority: "HIGH",
          status: "DRAFT",
          isDraft: true,
          isSent: false,
          senderId: pimpinan.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: pimpinan.id,
          title: "Data Demo Siap",
          message:
            "Data demo lengkap: 4 unit (KPAK, Kantin Baru, Kantin Umi, Koperasi Buku) beserta transaksi harian, persetujuan, inventori, tabungan santri, shift, POS, konsinyasi, stok, anggaran, pengumuman, dan permintaan pembelian.",
          type: "INFO",
          isRead: false,
        },
      });
      await tx.notification.create({
        data: {
          userId: pimpinan.id,
          title: "Pembaruan Aplikasi",
          message: "Versi terbaru ALBA Finance telah aktif sejak minggu lalu.",
          type: "SUCCESS",
          isRead: true,
          createdAt: dateDaysAgo(1),
        },
      });
      await tx.notification.create({
        data: {
          userId: managerKantinBaru.id,
          title: "Pengajuan Menunggu Persetujuan",
          message: "Ada transaksi staff yang menunggu persetujuan Anda hari ini.",
          type: "WARNING",
          isRead: false,
        },
      });
      await tx.notification.create({
        data: {
          userId: staffKantinBaru.id,
          title: "Shift Pagi Tercatat",
          message: "Shift pagi Anda tercatat pada menit 06:30 hari ini.",
          type: "INFO",
          isRead: true,
          createdAt: todayAt(7, 0),
        },
      });
      await tx.notification.create({
        data: {
          userId: managerKoperasi.id,
          title: "Tagihan Konsinyasi",
          message: "Terdapat pembayaran konsinyasi yang mendekati jatuh tempo.",
          type: "WARNING",
          isRead: false,
          createdAt: dateDaysAgo(1),
        },
      });
      await tx.notification.create({
        data: {
          userId: staffKoperasi.id,
          title: "Stok Diinput",
          message: "Pengisian stok buku dan alat tulis berhasil disimpan.",
          type: "SUCCESS",
          isRead: false,
        },
      });
      await tx.notification.create({
        data: {
          userId: managerKantinUmi.id,
          title: "Permintaan Pembelian Diterima",
          message: "Belanja bahan minuman Kantin Umi telah diterima lengkap.",
          type: "SUCCESS",
          isRead: true,
          createdAt: daysAgoAt(2, 14, 0),
        },
      });
      await tx.notification.create({
        data: {
          userId: staffKpak.id,
          title: "Tugas Mutasi Tabungan",
          message: "Ada permintaan setoran tabungan santri dari kiosk hari ini.",
          type: "INFO",
          isRead: false,
        },
      });

      for (const [key, value, description] of DEFAULT_SETTINGS)
        await tx.systemSetting.create({ data: { key, value, description } });

      return {
        message:
          "Data demo berhasil dibuat: 4 unit operasional, 9 akun pengguna per unit, transaksi harian dengan alur approval (approve, pending, rejected, draft), inventori retail, tabungan santri untuk kiosk, POS, shift, konsinyasi, stok, anggaran, pengumuman, dan permintaan pembelian.",
        units: UNITS.map((unit) => unit.name),
        demoPassword: DEMO_PASSWORD,
      };
    },
    { timeout: 30000 },
  );
}

const INSTALL_PASSWORD = "bismillah";

const INSTALL_USERS = [
  ["pimpinan@alba.app", "Pimpinan Alba", "PIMPINAN", null],
  ["manager.kpak@alba.app", "Manager KPAK", "MANAGER", "KPK-01"],
  ["manager.kantinbaru@alba.app", "Manager Kantin Baru", "MANAGER", "KNT-02"],
  ["manager.kantinumi@alba.app", "Manager Kantin Umi", "MANAGER", "KNT-01"],
  ["manager.koperasi@alba.app", "Manager Koperasi Buku", "MANAGER", "KOP-01"],
  ["staff.kpak@alba.app", "Staff KPAK", "STAFF", "KPK-01"],
  ["staff.kantinbaru@alba.app", "Staff Kantin Baru", "STAFF", "KNT-02"],
  ["staff.kantinumi@alba.app", "Staff Kantin Umi", "STAFF", "KNT-01"],
  ["staff.koperasi@alba.app", "Staff Koperasi Buku", "STAFF", "KOP-01"],
] as const;

export async function installFreshDatabase(prisma: PrismaClient) {
  return prisma.$transaction(
    async (tx) => {
      await clearAllData(tx, false);

      const lembaga = await tx.lembaga.create({
        data: {
          name: "Pondok Pesantren Al-Basyariyah",
          code: "AL-BASYARIYAH",
          description:
            "Sistem manajemen keuangan Pondok Pesantren Al-Basyariyah",
          address: "Jl. Mahmud, Rahayu, Margaasih, Bandung",
        },
      });

      const units = new Map<string, any>();
      for (const unitData of UNITS) {
        const unit = await tx.unit.create({
          data: { ...unitData, lembagaId: lembaga.id },
        });
        units.set(unit.code, unit);
        await tx.unitSetting.create({
          data: {
            unitId: unit.id,
            posEnabled: unit.isRetail,
            inventoryEnabled: unit.isRetail,
            requiresApproval: false,
          },
        });
      }

      const hashedPassword = await bcrypt.hash(INSTALL_PASSWORD, 12);

      await tx.user.create({
        data: {
          email: "admin@brontolano.com",
          name: "Super Admin",
          role: "SUPERADMIN",
          passwordHash: hashedPassword,
          lembagaId: lembaga.id,
        },
      });

      for (const [email, name, role, unitCode] of INSTALL_USERS) {
        await tx.user.create({
          data: {
            email,
            name,
            role: role as any,
            passwordHash: hashedPassword,
            lembagaId: lembaga.id,
            unitId: unitCode ? units.get(unitCode).id : null,
          },
        });
      }

      const categories = new Map<string, any>();
      for (const [name, code, type] of CATEGORIES) {
        const category = await tx.financialCategory.create({
          data: { name, code, type: type as any, lembagaId: lembaga.id },
        });
        categories.set(code, category);
      }

      for (const [code, unitCode, name, type, balance] of [
        ["KPK-KAS", "KPK-01", "Kas KPAK", "CASH", 0],
        ["KNT02-KAS", "KNT-02", "Kas Kantin Baru", "CASH", 0],
        ["KNT01-KAS", "KNT-01", "Kas Kantin Umi", "CASH", 0],
        ["KOP-KAS", "KOP-01", "Kas Koperasi Buku", "CASH", 0],
      ] as const) {
        await tx.bankAccount.create({
          data: {
            code,
            name,
            type: type as any,
            balance,
            unitId: units.get(unitCode).id,
          },
        });
      }

      for (const [key, value, description] of DEFAULT_SETTINGS)
        await tx.systemSetting.create({ data: { key, value, description } });

      return {
        message:
          "Instal ulang berhasil. 4 unit dan 10 akun pengguna dibuat. Silakan login kembali.",
        units: UNITS.map((u) => u.name),
        users: [
          "admin@brontolano.com",
          ...INSTALL_USERS.map((u) => u[0]),
        ],
        password: INSTALL_PASSWORD,
      };
    },
    { timeout: 30000 },
  );
}

export async function importDatabase(prisma: PrismaClient, payload: any) {
  if (
    !payload ||
    payload.version !== 1 ||
    !payload.data ||
    typeof payload.data !== "object"
  )
    throw new Error("Format backup tidak valid");
  return prisma.$transaction(
    async (tx) => {
      await clearAllData(tx, false);
      const data = payload.data;
      const createMany = async (model: string) => {
        const rows = Array.isArray(data[model]) ? data[model] : [];
        if (rows.length)
          await (tx as any)[model].createMany({
            data: rows,
            skipDuplicates: true,
          });
      };
      for (const model of [
        "lembaga",
        "unit",
        "user",
        "financialCategory",
        "unitSetting",
        "bankAccount",
        "inventoryItem",
        "systemSetting",
        "student",
        "savingsAccount",
        "savingsTransaction",
        "posSession",
        "transaction",
        "orderItem",
        "purchaseItem",
        "approval",
        "financialNote",
        "shiftSession",
        "shiftAttendance",
        "shiftReport",
        "cashHandover",
        "budgetAllocation",
        "consignmentOwner",
        "consignmentItem",
        "stockBatch",
        "stockBatchItem",
        "stockCount",
        "purchaseRequest",
        "purchaseRequestItem",
        "consignmentPayout",
        "notification",
        "broadcastMessage",
        "broadcastRecipient",
        "audit_logs",
        "push_subscriptions",
      ])
        await createMany(model);
      return { message: "Backup berhasil diimpor" };
    },
    { timeout: 30000 },
  );
}
