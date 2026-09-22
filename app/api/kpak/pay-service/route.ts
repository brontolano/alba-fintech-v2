import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { Prisma } from "../../../../generated/prisma/client";
import {
  resolveApprover,
  notifyPendingApproval,
} from "@/lib/approvalRouting";
import { hasActiveShift, isStaffKpak } from "@/lib/kpak-shift-gate";

const paySchema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
  // CASH (laci) | BANK (rekening) | TABUNGAN (potong saldo)
  // TUNAI diterima sebagai alias CASH untuk kompatibilitas lama.
  method: z.enum(["TUNAI", "CASH", "BANK", "TABUNGAN"]),
  studentNumber: z.string().optional(),
  unitId: z.string().optional(),
  photoUrl: z.string().max(500).optional(),
});

/**
 * Bayar layanan KPAK dalam SATU transaksi database:
 * potong saldo tabungan (jika via TABUNGAN) + catat pemasukan + approval.
 * Tidak ada lagi kondisi saldo terpotong tapi pemasukan gagal tercatat.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = paySchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Data pembayaran tidak valid" },
      { status: 400 },
    );

  const { categoryId, amount, note, studentNumber } = parsed.data;
  // Normalisasi: TUNAI lama = CASH
  const method =
    parsed.data.method === "TUNAI" ? "CASH" : (parsed.data.method as string);

  // Unit: operator pakai unit sendiri; pimpinan/superadmin boleh pilih unit
  let unitId = session.user.unitId;
  if ((role === "PIMPINAN" || role === "SUPERADMIN") && parsed.data.unitId)
    unitId = parsed.data.unitId;
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  // Staff KPAK wajib shift Keuangan aktif (cek di server agar tak bisa bypass UI)
  if (isStaffKpak(session.user)) {
    const ok = await hasActiveShift(unitId, session.user.id!, "KEUANGAN");
    if (!ok)
      return NextResponse.json(
        { error: "Check-in shift Keuangan dulu untuk melayani pembayaran" },
        { status: 403 },
      );
  }

  try {
    // Kategori harus INCOME dan terlihat oleh unit ini
    const category = await prisma.financialCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.type !== "INCOME")
      return NextResponse.json(
        { error: "Kategori layanan tidak valid" },
        { status: 400 },
      );
    if (
      role !== "SUPERADMIN" &&
      category.unitId !== null &&
      category.unitId !== unitId
    )
      return NextResponse.json(
        { error: "Kategori di luar unit Anda" },
        { status: 403 },
      );

    // Santri wajib untuk pembayaran via tabungan
    let account: any = null;
    let student: any = null;
    if (method === "TABUNGAN") {
      if (!studentNumber?.trim())
        return NextResponse.json(
          { error: "NIS santri wajib untuk pembayaran via tabungan" },
          { status: 400 },
        );
      student = await prisma.student.findFirst({
        where: {
          studentNumber: studentNumber.trim(),
          isActive: true,
          ...(role === "MANAGER" || role === "STAFF"
            ? { unitId }
            : {}),
          ...(role === "PIMPINAN" ? { lembagaId: session.user.lembagaId } : {}),
        },
        include: { account: true },
      });
      if (!student?.account || student.account.status !== "ACTIVE")
        return NextResponse.json(
          { error: "Santri atau rekening tabungan tidak ditemukan" },
          { status: 404 },
        );
      account = student.account;
      if (Number(account.balance) < amount)
        return NextResponse.json(
          { error: "Saldo tabungan santri tidak mencukupi" },
          { status: 400 },
        );
    }

    const santriLabel = student
      ? ` — ${student.name} (${student.studentNumber})`
      : "";
    const description = `${category.name}${santriLabel}${note ? ` — ${note}` : ""}`;

    const unitSettings = await prisma.unitSetting.findUnique({
      where: { unitId },
      select: { requiresApproval: true },
    });
    const requiresApproval = unitSettings?.requiresApproval ?? false;
    const isFinalAuthority = role === "PIMPINAN" || role === "SUPERADMIN";
    const approved = isFinalAuthority || !requiresApproval;

    const result = await prisma.$transaction(
      async (tx) => {
        let savingsTx: any = null;
        let balanceAfter: number | null = null;

        if (method === "TABUNGAN") {
          // Baca ulang saldo di dalam transaksi (anti race-condition)
          const fresh = await tx.savingsAccount.findUnique({
            where: { id: account.id },
          });
          if (!fresh || fresh.status !== "ACTIVE")
            throw new Error("Rekening tabungan tidak aktif");
          const before = Number(fresh.balance);
          const after = before - amount;
          if (after < 0)
            throw new Error("Saldo tabungan santri tidak mencukupi");
          await tx.savingsAccount.update({
            where: { id: account.id },
            data: { balance: after },
          });
          savingsTx = await tx.savingsTransaction.create({
            data: {
              accountId: account.id,
              unitId,
              type: "WITHDRAWAL",
              amount,
              balanceBefore: before,
              balanceAfter: after,
              description: `Bayar ${category.name}${note ? ` — ${note}` : ""}`,
              channel: "TABUNGAN",
              createdById: session.user.id!,
            },
          });
          balanceAfter = after;
        }

        const channelLabel =
          method === "TABUNGAN" ? "[Tabungan]" : method === "BANK" ? "[Bank]" : "";
        const transaction = await tx.transaction.create({
          data: {
            unitId,
            type: "INCOME",
            amount,
            description: channelLabel
              ? `${channelLabel} ${description}`
              : description,
            categoryId,
            reference: savingsTx ? `TABUNGAN:${savingsTx.id}` : undefined,
            photoUrl: parsed.data.photoUrl || undefined,
            paymentMethod: method,
            createdById: session.user.id!,
            status: approved ? "APPROVED" : "PENDING",
            approvedById: approved ? session.user.id : undefined,
            approvedAt: approved ? new Date() : undefined,
          },
        });

        let approverId: string | null = null;
        if (!isFinalAuthority && requiresApproval) {
          approverId = await resolveApprover(unitId, role);
          if (approverId) {
            await tx.approval.create({
              data: {
                transactionId: transaction.id,
                approverId,
                unitId,
                status: "PENDING",
              },
            });
          }
        }

        return { transaction, savingsTx, balanceAfter, approverId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Notifikasi approver (setelah commit, non-blocking)
    if (result.approverId) {
      const unitName = await prisma.unit
        .findUnique({ where: { id: unitId }, select: { name: true } })
        .then((u) => u?.name)
        .catch(() => undefined);
      await notifyPendingApproval({
        approverId: result.approverId,
        transactionId: result.transaction.id,
        description,
        amount,
        creatorName: session.user.name || session.user.email || "Pengguna",
        unitName,
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        data: {
          transactionId: result.transaction.id,
          status: result.transaction.status,
          balanceAfter: result.balanceAfter,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[KPAK Pay Service]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses pembayaran" },
      { status: error.message?.includes("mencukupi") ? 400 : 500 },
    );
  }
}
