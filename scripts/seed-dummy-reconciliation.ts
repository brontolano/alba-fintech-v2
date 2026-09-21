/**
 * Seed data untuk menguji halaman rekonsiliasi.
 *
 * Catatan: MySQL remote (Hostinger) sering gagal di emulasi RETURNING Prisma
 * ("required to return data, but found no record(s)") padahal INSERT berhasil.
 * Karena itu upsert dilakukan via raw SQL INSERT ... ON DUPLICATE KEY UPDATE
 * yang tidak memerlukan SELECT return, lalu diverifikasi dengan findUnique.
 *
 * Jalankan setelah seed.ts:
 *   npx tsx scripts/seed-dummy-reconciliation.ts
 */
import "dotenv/config";
import { createPrismaClient } from "../lib/prisma";

const prisma = createPrismaClient();

async function main() {
  const lembaga = await prisma.lembaga.findFirst({
    where: { code: { in: ["AL-BASYARIYAH", "ALBA-DUMMY"] } },
  });
  if (!lembaga) {
    throw new Error(
      "Lembaga belum tersedia. Jalankan npm run db:seed terlebih dahulu.",
    );
  }

  const units = await prisma.unit.findMany({
    where: { lembagaId: lembaga.id },
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (units.length === 0) {
    throw new Error(
      "Unit belum tersedia. Jalankan npm run db:seed terlebih dahulu.",
    );
  }

  const creator = await prisma.user.findFirst({
    where: {
      lembagaId: lembaga.id,
      role: { in: ["PIMPINAN", "MANAGER", "STAFF"] },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!creator) {
    throw new Error(
      "User belum tersedia. Jalankan npm run db:seed terlebih dahulu.",
    );
  }

  const reconciler = await prisma.user.findFirst({
    where: { lembagaId: lembaga.id, role: { in: ["PIMPINAN", "MANAGER"] } },
    orderBy: { createdAt: "asc" },
  });

  const incomeCategory = await prisma.financialCategory.findFirst({
    where: { lembagaId: lembaga.id, type: "INCOME" },
  });
  const expenseCategory = await prisma.financialCategory.findFirst({
    where: { lembagaId: lembaga.id, type: "EXPENSE" },
  });

  const scenarios = [
    {
      key: "income-pending",
      unitId: units[0].id,
      type: "INCOME" as const,
      amount: 2500000,
      reconciled: false,
      daysAgo: 0,
      title: "Kas Pondok - Menunggu Rekonsiliasi",
      description:
        "Pemasukan kas unit pondok dari iuran bulanan santri yang masih menunggu rekonsiliasi.",
    },
    {
      key: "expense-pending",
      unitId: units[0].id,
      type: "EXPENSE" as const,
      amount: 650000,
      reconciled: false,
      daysAgo: 1,
      title: "Belanja Operasional Unit",
      description:
        "Pembelian kebutuhan operasional harian unit yang masuk dalam proses pengecekan.",
    },
    {
      key: "income-complete",
      unitId: units[0].id,
      type: "INCOME" as const,
      amount: 1750000,
      reconciled: true,
      daysAgo: 2,
      title: "Pendapatan Usaha Kantin",
      description:
        "Pendapatan usaha kantin setelah validasi dan persetujuan final oleh pimpinan.",
    },
    {
      key: "expense-complete",
      unitId: (units[1] ?? units[0]).id,
      type: "EXPENSE" as const,
      amount: 400000,
      reconciled: true,
      daysAgo: 0,
      title: "Pembelian Stok Inventaris",
      description:
        "Pengeluaran untuk pembelian stok inventaris yang sudah disetujui dan tercatat.",
    },
    {
      key: "lembaga-general",
      unitId: null,
      type: "INCOME" as const,
      amount: 1200000,
      reconciled: false,
      daysAgo: 1,
      title: "Bantuan Operasional Pusat",
      description:
        "Catatan lembaga untuk dukungan operasional pusat yang tidak terikat pada unit tertentu.",
    },
  ];

  for (const scenario of scenarios) {
    const id = `dummy-reconciliation-${scenario.key}`;
    const title = scenario.title;
    const description = scenario.description;
    const date = new Date(Date.now() - scenario.daysAgo * 24 * 60 * 60 * 1000);
    const categoryId =
      scenario.type === "INCOME"
        ? (incomeCategory?.id ?? null)
        : (expenseCategory?.id ?? null);
    const approvedById = reconciler?.id ?? creator.id;
    const reconciledById = scenario.reconciled
      ? (reconciler?.id ?? null)
      : null;
    const reconciledAt = scenario.reconciled ? date : null;
    const isReconciled = scenario.reconciled ? 1 : 0;

    // Upsert via raw SQL: tidak butuh SELECT return -> kebal masalah read lag
    await prisma.$executeRaw`
      INSERT INTO financial_notes
        (id, unitId, title, description, amount, type, date, categoryId, createdById, approvedById, approvedAt, isReconciled, reconciledAt, reconciledById)
      VALUES
        (${id}, ${scenario.unitId}, ${title}, ${description}, ${scenario.amount}, ${scenario.type}, ${date}, ${categoryId}, ${creator.id}, ${approvedById}, ${date}, ${isReconciled}, ${reconciledAt}, ${reconciledById})
      ON DUPLICATE KEY UPDATE
        unitId = VALUES(unitId),
        title = VALUES(title),
        description = VALUES(description),
        amount = VALUES(amount),
        type = VALUES(type),
        date = VALUES(date),
        categoryId = VALUES(categoryId),
        createdById = VALUES(createdById),
        approvedById = VALUES(approvedById),
        approvedAt = VALUES(approvedAt),
        isReconciled = VALUES(isReconciled),
        reconciledAt = VALUES(reconciledAt),
        reconciledById = VALUES(reconciledById),
        updatedAt = CURRENT_TIMESTAMP
    `;
    console.log(`✅ upsert: ${id}`);

    // Verifikasi (jangan fail kalau cuma read lag)
    const row = await prisma.financialNote
      .findUnique({ where: { id }, select: { id: true, isReconciled: true } })
      .catch(() => null);
    if (!row) console.log(`   ⚠️  verifikasi tertunda (read lag) untuk ${id}`);
  }

  const total = await prisma.financialNote.count({
    where: { id: { startsWith: "dummy-reconciliation-" } },
  });
  console.log(
    `\n🎉 Selesai. Total data rekonsiliasi ter-seed di DB: ${total}/5`,
  );
}

main()
  .catch((error) => {
    console.error("Dummy reconciliation seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
