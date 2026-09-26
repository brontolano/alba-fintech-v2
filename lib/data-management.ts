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

const DEMO_PASSWORD = "Bismillah123!";

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
  ["pimpinan.demo@alba.local", "Ust. Ahmad (Pimpinan)", "PIMPINAN", null],
  ["manager.kpak.demo@alba.local", "Ali (Manager KPAK)", "MANAGER", "KPK-01"],
  [
    "manager.kantinbaru.demo@alba.local",
    "Eka (Manager Kantin Baru)",
    "MANAGER",
    "KNT-02",
  ],
  [
    "manager.kantinumi.demo@alba.local",
    "Diana (Manager Kantin Umi)",
    "MANAGER",
    "KNT-01",
  ],
  [
    "manager.koperasi.demo@alba.local",
    "Budi (Manager Koperasi Buku)",
    "MANAGER",
    "KOP-01",
  ],
  ["staff.kantinbaru.demo@alba.local", "Staff Kantin Baru", "STAFF", "KNT-02"],
  ["staff.kantinumi.demo@alba.local", "Staff Kantin Umi", "STAFF", "KNT-01"],
  ["staff.koperasi.demo@alba.local", "Staff Koperasi Buku", "STAFF", "KOP-01"],
] as const;

const INVENTORY = [
  ["KNT-02", "Nasi Uduk", "DEMO-NU-KNT02", "Makanan", 80, 10, 12000, 8000],
  ["KNT-02", "Es Campur", "DEMO-EC-KNT02", "Minuman", 120, 20, 10000, 6000],
  ["KNT-01", "Nasi Goreng", "DEMO-NG-KNT01", "Makanan", 100, 10, 15000, 10000],
  ["KNT-01", "Es Teh Manis", "DEMO-ET-KNT01", "Minuman", 150, 20, 8000, 5000],
  ["KOP-01", "Buku Tulis", "DEMO-BT-KOP01", "Alat Tulis", 300, 50, 5000, 3000],
  ["KOP-01", "Pensil 2B", "DEMO-P2B-KOP01", "Alat Tulis", 200, 30, 3000, 1500],
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
      const pimpinan = users.get("pimpinan.demo@alba.local");

      const categories = new Map<string, any>();
      for (const [name, code, type] of CATEGORIES) {
        const category = await tx.financialCategory.create({
          data: { name, code, type: type as any, lembagaId: lembaga.id },
        });
        categories.set(code, category);
      }

      const accounts = new Map<string, any>();
      for (const [code, unitCode, name, type, balance] of [
        ["DEMO-KPK-KAS", "KPK-01", "Kas KPAK", "CASH", 50000000],
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
          "manager.kpak.demo@alba.local",
          "INC-SETOR",
          "INCOME",
          12000000,
          "Setoran kas harian KPAK dari unit administrasi",
          "APPROVED",
        ],
        [
          "KPK-01",
          "manager.kpak.demo@alba.local",
          "EXP-UTIL",
          "EXPENSE",
          2500000,
          "Pembayaran listrik dan air kantor KPAK",
          "PENDING",
        ],
        [
          "KPK-01",
          "manager.kpak.demo@alba.local",
          "INC-LEMBAGA",
          "INCOME",
          1800000,
          "Pemasukan lembaga dari iuran operasional",
          "APPROVED",
        ],
        [
          "KNT-02",
          "manager.kantinbaru.demo@alba.local",
          "INC-PENJUALAN",
          "INCOME",
          680000,
          "Penjualan harian menu siang Kantin Baru",
          "APPROVED",
        ],
        [
          "KNT-02",
          "staff.kantinbaru.demo@alba.local",
          "EXP-STOK",
          "EXPENSE",
          220000,
          "Pembelian stok bahan baku dan minuman",
          "PENDING",
        ],
        [
          "KNT-02",
          "staff.kantinbaru.demo@alba.local",
          "EXP-OPR",
          "EXPENSE",
          150000,
          "Biaya kebersihan, gas, dan operasional kecil",
          "APPROVED",
        ],
        [
          "KNT-01",
          "manager.kantinumi.demo@alba.local",
          "INC-PENJUALAN",
          "INCOME",
          510000,
          "Penjualan paket makan siang Kantin Umi",
          "APPROVED",
        ],
        [
          "KNT-01",
          "staff.kantinumi.demo@alba.local",
          "EXP-STOK",
          "EXPENSE",
          180000,
          "Pembelian bahan baku masakan hari ini",
          "PENDING",
        ],
        [
          "KNT-01",
          "manager.kantinumi.demo@alba.local",
          "EXP-OPR",
          "EXPENSE",
          120000,
          "Pembayaran kebersihan dan perlengkapan kantin",
          "APPROVED",
        ],
        [
          "KOP-01",
          "manager.koperasi.demo@alba.local",
          "INC-PENJUALAN",
          "INCOME",
          750000,
          "Penjualan buku pelajaran dan perlengkapan sekolah",
          "APPROVED",
        ],
        [
          "KOP-01",
          "staff.koperasi.demo@alba.local",
          "EXP-STOK",
          "EXPENSE",
          300000,
          "Pembelian stok buku dan alat tulis baru",
          "PENDING",
        ],
        [
          "KOP-01",
          "manager.koperasi.demo@alba.local",
          "INC-SETOR",
          "INCOME",
          900000,
          "Setoran kas dari penjualan buku dan admin koperasi",
          "APPROVED",
        ],
      ] as const;
      for (const [
        unitCode,
        email,
        categoryCode,
        type,
        amount,
        description,
        status,
      ] of transactions) {
        const creator = users.get(email);
        const transaction = await tx.transaction.create({
          data: {
            unitId: units.get(unitCode).id,
            type: type as any,
            amount,
            description: `[DEMO] ${description}`,
            reference: `DEMO-${unitCode}`,
            status: status as any,
            createdById: creator.id,
            categoryId: categories.get(categoryCode).id,
            accountId: accounts.get(unitCode).id,
            approvedById: status === "APPROVED" ? creator.id : null,
            approvedAt: status === "APPROVED" ? dateDaysAgo(1) : null,
            date: dateDaysAgo(1),
          },
        });
        if (status === "PENDING")
          await tx.approval.create({
            data: {
              transactionId: transaction.id,
              unitId: transaction.unitId,
              approverId:
                creator.role === "STAFF"
                  ? users.get(
                      unitCode === "KNT-02"
                        ? "manager.kantinbaru.demo@alba.local"
                        : unitCode === "KNT-01"
                          ? "manager.kantinumi.demo@alba.local"
                          : "manager.koperasi.demo@alba.local",
                    ).id
                  : pimpinan.id,
              status: "PENDING",
            },
          });
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
      const kpakCreator = users.get("manager.kpak.demo@alba.local");
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
              type,
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
              createdById: kpakCreator.id,
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

      const managerKpak = users.get("manager.kpak.demo@alba.local");
      const managerKantinBaru = users.get("manager.kantinbaru.demo@alba.local");
      const managerKantinUmi = users.get("manager.kantinumi.demo@alba.local");
      const managerKoperasi = users.get("manager.koperasi.demo@alba.local");
      const staffKantinBaru = users.get("staff.kantinbaru.demo@alba.local");

      const closedPos = await tx.posSession.create({
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
      const closedPosSale = await tx.transaction.create({
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
          posSessionId: closedPos.id,
        },
      });
      await tx.orderItem.create({
        data: {
          transactionId: closedPosSale.id,
          itemId: inventoryItems.get("DEMO-NU-KNT02").id,
          itemName: "Nasi Uduk",
          quantity: 15,
          unitPrice: 12000,
          totalPrice: 180000,
        },
      });
      await tx.orderItem.create({
        data: {
          transactionId: closedPosSale.id,
          itemId: inventoryItems.get("DEMO-EC-KNT02").id,
          itemName: "Es Campur",
          quantity: 20,
          unitPrice: 10000,
          totalPrice: 200000,
        },
      });

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
      await tx.orderItem.create({
        data: {
          transactionId: todaySaleKnt02.id,
          itemId: inventoryItems.get("DEMO-NU-KNT02").id,
          itemName: "Nasi Uduk",
          quantity: 10,
          unitPrice: 12000,
          totalPrice: 120000,
        },
      });
      await tx.orderItem.create({
        data: {
          transactionId: todaySaleKnt02.id,
          itemId: inventoryItems.get("DEMO-EC-KNT02").id,
          itemName: "Es Campur",
          quantity: 3,
          unitPrice: 10000,
          totalPrice: 30000,
        },
      });

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
      await tx.orderItem.create({
        data: {
          transactionId: todaySaleKnt01.id,
          itemId: inventoryItems.get("DEMO-NG-KNT01").id,
          itemName: "Nasi Goreng",
          quantity: 10,
          unitPrice: 15000,
          totalPrice: 150000,
        },
      });
      await tx.orderItem.create({
        data: {
          transactionId: todaySaleKnt01.id,
          itemId: inventoryItems.get("DEMO-ET-KNT01").id,
          itemName: "Es Teh Manis",
          quantity: 5,
          unitPrice: 8000,
          totalPrice: 40000,
        },
      });

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
      await tx.orderItem.create({
        data: {
          transactionId: todaySaleKop01.id,
          itemId: inventoryItems.get("DEMO-BT-KOP01").id,
          itemName: "Buku Tulis",
          quantity: 20,
          unitPrice: 5000,
          totalPrice: 100000,
        },
      });
      await tx.orderItem.create({
        data: {
          transactionId: todaySaleKop01.id,
          itemId: inventoryItems.get("DEMO-P2B-KOP01").id,
          itemName: "Pensil 2B",
          quantity: 20,
          unitPrice: 3000,
          totalPrice: 60000,
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

      const purchase = await tx.purchaseRequest.create({
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
          requestId: purchase.id,
          itemId: inventoryItems.get("DEMO-NU-KNT02").id,
          name: "Nasi Uduk",
          qtyRequested: 50,
          estUnitCost: 8000,
          isNewItem: false,
        },
      });
      await tx.purchaseRequestItem.create({
        data: {
          requestId: purchase.id,
          itemId: null,
          name: "Saus Sambal (Baru)",
          qtyRequested: 10,
          estUnitCost: 5000,
          isNewItem: true,
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

      await tx.notification.create({
        data: {
          userId: pimpinan.id,
          title: "Demo Modul Operasional Siap",
          message:
            "Data demo lengkap: 4 unit (KPAK, Kantin Baru, Kantin Umi, Koperasi Buku) beserta transaksi harian, persetujuan, inventori, tabungan santri, shift, POS, konsinyasi, stok, anggaran KPAK, dan permintaan pembelian.",
          type: "INFO",
        },
      });
      for (const [key, value, description] of DEFAULT_SETTINGS)
        await tx.systemSetting.create({ data: { key, value, description } });

      return {
        message:
          "Data demo berhasil dibuat: 4 unit operasional, akun pengguna per unit, transaksi harian dengan alur approval, inventori retail, tabungan santri untuk kiosk, POS, shift, konsinyasi, stok, anggaran KPAK, dan pengaturan default.",
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
