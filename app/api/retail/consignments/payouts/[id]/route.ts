import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const patchSchema = z.object({
  action: z.enum(["pay", "cancel"]),
  note: z.string().max(1000).optional().nullable(),
});

/** PATCH /api/retail/consignments/payouts/[id]
 *  action=pay   → tandai PAID + catat Transaction EXPENSE (kas keluar ke pemilik).
 *  action=cancel → batalkan payout (PENDING→CANCELLED).
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = request.nextUrl.pathname.split("/").pop();
  const unitId = await resolveUnitId(session, null);
  if (!id || !unitId)
    return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
  if (!session.user.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUserId: string = session.user.id;

  const existing = await prisma.consignmentPayout.findFirst({
    where: { id, unitId },
    include: { owners: { select: { name: true } } },
  });
  if (!existing)
    return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Aksi tidak valid" },
      { status: 400 },
    );

  try {
    if (parsed.data.action === "cancel") {
      if (existing.status === "PAID")
        return NextResponse.json(
          { error: "Pembayaran sudah PAID — tidak bisa dibatalkan" },
          { status: 409 },
        );
      const row = await prisma.consignmentPayout.update({
        where: { id },
        data: { status: "CANCELLED", note: parsed.data.note ?? existing.note },
      });
      return NextResponse.json({ data: row });
    }

    // action=pay
    if (existing.status === "PAID")
      return NextResponse.json(
        { error: "Pembayaran sudah PAID" },
        { status: 409 },
      );
    if (existing.status === "CANCELLED")
      return NextResponse.json(
        { error: "Pembayaran dibatalkan" },
        { status: 409 },
      );

    // Cari akun kas default unit (fallback null → akun dari transaksi lain).
    const cashAccount = await prisma.bankAccount.findFirst({
      where: { unitId, type: "CASH", isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const reference = `CONSIGN-PAYOUT-${existing.id}`;
    const transaction = await prisma.$transaction(async (tx) => {
      // Hindari dobel pencatatan bila reference sudah pernah dipakai.
      const dup = await tx.transaction.findFirst({
        where: { unitId, reference, status: { not: "REJECTED" } },
      });
      if (dup) {
        await tx.consignmentPayout.update({
          where: { id },
          data: { status: "PAID", transactionId: dup.id, paidById: currentUserId },
        });
        return dup;
      }
      const trx = await tx.transaction.create({
        data: {
          unitId,
          type: "EXPENSE",
          amount: existing.amount,
          description:
            `Pembayaran titipan (konsinyasi) kepada ${existing.owners.name} ` +
            `periode ${existing.fromDate.toISOString().slice(0, 10)} – ${existing.toDate.toISOString().slice(0, 10)}`,
          reference,
          date: new Date(),
          status: "APPROVED",
          createdById: currentUserId,
          approvedById: currentUserId,
          approvedAt: new Date(),
          isReconciled: false,
          accountId: cashAccount?.id || null,
        },
      });
      await tx.consignmentPayout.update({
        where: { id },
        data: {
          status: "PAID",
          transactionId: trx.id,
          paidById: currentUserId,
          updatedAt: new Date(),
        },
      });
      return trx;
    });

    return NextResponse.json({ data: { payoutId: id, status: "PAID", transactionId: transaction.id } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memproses pembayaran" },
      { status: 500 },
    );
  }
}