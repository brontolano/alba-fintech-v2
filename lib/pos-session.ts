import prisma from "@/lib/prisma";

// Transaksi tunai = paymentMethod kosong atau CASH (samakan dgn modul rekonsiliasi).
const isCashMethod = (m: unknown) =>
  !m || String(m).toUpperCase() === "CASH";

export type OpenPos = {
  id: string;
  unitId: string;
  userId: string;
  openedAt: Date;
  openingCash: number | string | object;
};

/** Sesi POS terbuka milik user di unit (paling baru). Dipakai lintas route (gate check-out). */
export async function findOpenPosSession(unitId: string, userId: string) {
  return prisma.posSession.findFirst({
    where: { unitId, userId, closedAt: null },
    orderBy: { openedAt: "desc" },
  });
}

/** Hitung ekspektasi kas sesi: modal + INCOME tunai − EXPENSE tunai. */
export async function summarizePosSession(open: OpenPos) {
  const sessionId = open.id;
  const unitId = open.unitId;
  const ownerId = open.userId;
  const openedAt = open.openedAt;
  const openingCash = Number(open.openingCash);
  const txs = await prisma.transaction.findMany({
    where: {
      unitId,
      status: { not: "REJECTED" },
      OR: [
        { posSessionId: sessionId },
        {
          posSessionId: null,
          createdById: ownerId,
          createdAt: { gte: openedAt },
        },
      ],
    },
    select: { type: true, amount: true, paymentMethod: true },
  });
  let incomeCash = 0;
  let expenseCash = 0;
  for (const t of txs) {
    if (!isCashMethod(t.paymentMethod)) continue;
    const amt = Number(t.amount);
    if (t.type === "INCOME") incomeCash += amt;
    else if (t.type === "EXPENSE") expenseCash += amt;
  }
  const expectedCash =
    Math.round((openingCash + incomeCash - expenseCash) * 100) / 100;
  return { txCount: txs.length, txTotal: incomeCash, expectedCash };
}

/**
 * Mitigasi otomatis (R5): tutup paksa sesi POS yang masih terbuka.
 * countedCash = expectedCash, selisih 0, autoClosed = true + jejak alasan.
 */
export async function autoClosePosSession(open: OpenPos, reason: string) {
  const s = await summarizePosSession(open);
  const row = await prisma.posSession.update({
    where: { id: open.id },
    data: {
      closedAt: new Date(),
      expectedCash: s.expectedCash,
      countedCash: s.expectedCash,
      discrepancy: 0,
      autoClosed: true,
      closeNote: `AUTO-CLOSE: ${reason}`.slice(0, 500),
    },
  });
  return { row, summary: s };
}
