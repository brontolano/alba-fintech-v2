import prisma from '@/lib/prisma';

/**
 * Routing persetujuan transaksi ALBA:
 *
 *   STAFF    (transaksi unit)     -> MANAGER unit-nya
 *   MANAGER  (transaksi unit)     -> PIMPINAN lembaga
 *   PIMPINAN (transaksi lembaga)  -> otomatis disetujui (otoritas tertinggi)
 *   SUPERADMIN                    -> otomatis disetujui
 *
 * Fallback bila approver tidak ditemukan:
 *   Staff tanpa Manager  -> Pimpinan lembaga -> SUPERADMIN
 *   Manager tanpa Pimpinan -> SUPERADMIN
 */

export const LEMBAGA_UNIT_SENTINEL = '__LEMBAGA__';

/** Pimpinan lembaga dari unit, fallback ke SUPERADMIN. */
export async function resolveEscalation(unitId: string): Promise<string | null> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { lembagaId: true },
  });

  if (unit?.lembagaId) {
    const pimpinan = await prisma.user.findFirst({
      where: { role: 'PIMPINAN', lembagaId: unit.lembagaId, isActive: true },
      select: { id: true },
    });
    if (pimpinan) return pimpinan.id;
  }

  const superadmin = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN', isActive: true },
    select: { id: true },
  });
  return superadmin?.id ?? null;
}

/**
 * Tentukan approver untuk transaksi berdasarkan role pembuatnya.
 * Mengembalikan null bila pembuat adalah otoritas final (PIMPINAN/SUPERADMIN)
 * atau benar-benar tidak ada kandidat approver.
 */
export async function resolveApprover(
  unitId: string,
  creatorRole: string,
): Promise<string | null> {
  if (creatorRole === 'STAFF') {
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER', unitId, isActive: true },
      select: { id: true },
    });
    if (manager) return manager.id;
    // Tidak ada Manager di unit -> naik ke Pimpinan/SUPERADMIN
    return resolveEscalation(unitId);
  }

  if (creatorRole === 'MANAGER') {
    return resolveEscalation(unitId);
  }

  // PIMPINAN / SUPERADMIN: otoritas final, tidak perlu approval
  return null;
}

/**
 * Buat record Notification untuk approver bahwa ada transaksi menunggu persetujuan.
 * Gagal kirim notifikasi tidak boleh menggagalkan transaksi utama.
 */
export async function notifyPendingApproval(params: {
  approverId: string;
  transactionId: string;
  description: string;
  amount: number;
  creatorName: string;
  unitName?: string | null;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.approverId,
        title: 'Pengajuan Persetujuan',
        message: `${params.creatorName} mengajukan ${params.description}` +
          (params.unitName ? ` (${params.unitName})` : '') +
          ` — Rp ${params.amount.toLocaleString('id-ID')}`,
        type: 'WARNING',
      },
    });
  } catch (err) {
    console.error('[notifyPendingApproval] gagal:', err);
  }
}

/**
 * Beri tahu pembuat transaksi hasil keputusan (disetujui/ditolak).
 */
export async function notifyApprovalDecision(params: {
  creatorId: string;
  transactionId: string;
  description: string;
  approved: boolean;
  approverName: string;
  comment?: string | null;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.creatorId,
        title: params.approved ? 'Transaksi Disetujui' : 'Transaksi Ditolak',
        message:
          `${params.approverName} ${params.approved ? 'menyetujui' : 'menolak'} "${params.description}"` +
          (params.comment ? ` — "${params.comment}"` : ''),
        type: params.approved ? 'SUCCESS' : 'ERROR',
      },
    });
  } catch (err) {
    console.error('[notifyApprovalDecision] gagal:', err);
  }
}

/**
 * Resolve (atau buat sekali) unit virtual "Lembaga" yang dipakai Pimpinan
 * untuk mencatat transaksi di luar kebutuhan unit (level lembaga).
 * Tidak perlu migrasi schema: memanfaatkan model Unit biasa dengan kode khusus.
 */
export async function resolveLembagaUnit(
  lembagaId: string,
): Promise<{ id: string } | null> {
  const lembaga = await prisma.lembaga.findUnique({
    where: { id: lembagaId },
    select: { name: true },
  });
  if (!lembaga) return null;

  const code = `LMBG-${lembagaId}`;
  const existing = await prisma.unit.findUnique({
    where: { code },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.unit.create({
    data: {
      name: `${lembaga.name} (Lembaga)`,
      code,
      lembagaId,
      type: 'UMUM',
      isRetail: false,
    },
    select: { id: true },
  });
}
