import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
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
  ["Pemasukan Administrasi", "INC-ADM", "INCOME"],
  ["Penjualan Barang", "INC-PEN", "INCOME"],
  ["SPP dan Biaya Pendidikan", "INC-SPP", "INCOME"],
  ["Donasi", "INC-DON", "INCOME"],
  ["Pengeluaran Operasional", "EXP-OPR", "EXPENSE"],
  ["Pembelian Barang", "EXP-BEL", "EXPENSE"],
  ["Gaji Karyawan", "EXP-GAJ", "EXPENSE"],
  ["Listrik dan Air", "EXP-LST", "EXPENSE"],
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

const DATA_MODELS = [
  "notification",
  "broadcastRecipient",
  "approval",
  "orderItem",
  "transaction",
  "financialNote",
  "broadcastMessage",
  "inventoryItem",
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
  await tx.notification.deleteMany({});
  await tx.broadcastRecipient.deleteMany({});
  await tx.approval.deleteMany({});
  await tx.orderItem.deleteMany({});
  await tx.transaction.deleteMany({});
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
            requiresApproval: true,
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
          "INC-SPP",
          "INCOME",
          12000000,
          "Pembayaran SPP santri bulan ini",
          "APPROVED",
        ],
        [
          "KPK-01",
          "manager.kpak.demo@alba.local",
          "EXP-OPR",
          "EXPENSE",
          2500000,
          "Pembayaran listrik dan air KPAK",
          "PENDING",
        ],
        [
          "KNT-02",
          "manager.kantinbaru.demo@alba.local",
          "INC-PEN",
          "INCOME",
          680000,
          "Penjualan menu sarapan Kantin Baru",
          "APPROVED",
        ],
        [
          "KNT-02",
          "staff.kantinbaru.demo@alba.local",
          "EXP-BEL",
          "EXPENSE",
          220000,
          "Pembelian bahan dan minuman",
          "PENDING",
        ],
        [
          "KNT-01",
          "manager.kantinumi.demo@alba.local",
          "INC-PEN",
          "INCOME",
          510000,
          "Penjualan paket makan siang Kantin Umi",
          "APPROVED",
        ],
        [
          "KNT-01",
          "staff.kantinumi.demo@alba.local",
          "EXP-BEL",
          "EXPENSE",
          180000,
          "Pembelian bahan baku masak",
          "PENDING",
        ],
        [
          "KOP-01",
          "manager.koperasi.demo@alba.local",
          "INC-PEN",
          "INCOME",
          750000,
          "Penjualan buku pelajaran",
          "APPROVED",
        ],
        [
          "KOP-01",
          "staff.koperasi.demo@alba.local",
          "EXP-BEL",
          "EXPENSE",
          300000,
          "Pembelian buku dari penerbit",
          "PENDING",
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
        await tx.inventoryItem.create({
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
      }

      await tx.financialNote.createMany({
        data: [
          {
            title: "Rekap Pemasukan Harian",
            description: "Ringkasan pemasukan seluruh unit",
            amount: 13940000,
            type: "INCOME",
            createdById: pimpinan.id,
            date: dateDaysAgo(1),
          },
          {
            title: "Pengeluaran Operasional",
            description: "Ringkasan pengeluaran demo",
            amount: 3200000,
            type: "EXPENSE",
            createdById: pimpinan.id,
            date: dateDaysAgo(1),
          },
        ],
      });

      await tx.notification.create({
        data: {
          userId: pimpinan.id,
          title: "Data Demo Aktif",
          message: "Data contoh empat unit siap digunakan untuk edukasi.",
          type: "INFO",
        },
      });
      for (const [key, value, description] of DEFAULT_SETTINGS)
        await tx.systemSetting.create({ data: { key, value, description } });

      return {
        message: "Data demo empat unit berhasil dibuat",
        units: UNITS.map((unit) => unit.name),
        demoPassword: DEMO_PASSWORD,
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
        "transaction",
        "orderItem",
        "approval",
        "financialNote",
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
