import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { startOfWibDay } from "@/lib/savings-limit";

/**
 * POST /api/smartpay
 *
 * Pembayaran smart card (RFID/NFC) santri di unit retail.
 * Menyelesaikan debit saldo tabungan + pencatatan transaksi FINANCE
 * (INCOME + order items) + pengurangan stok dalam SATU transaksi Prisma.
 *
 * Body: { cardUid, unitId?, items: [{itemId, quantity}], description? }
 *  - harga & total SELALU dihitung ulang dari DB (penghindaran manipulasi).
 *
 * Lihat docs/DESAIN-SMARTCARD.md untuk latar belakang & roadmap.
 */

const smartPaySchema = z.object({
  cardUid: z.string().min(1, "cardUid wajib diisi"),
  unitId: z.string().optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, "itemId wajib diisi"),
        quantity: z
          .number()
          .int("quantity harus bilangan bulat")
          .positive("quantity harus lebih dari 0"),
      }),
    )
    .min(1, "Minimal satu item"),
  description: z.string().optional(),
});

const ALLOWED_ROLES = ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = smartPaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const cardUid = parsed.data.cardUid.trim().toUpperCase();
    const description = parsed.data.description?.trim() || "Pembayaran kartu";

    // Unit scope: MANAGER/STAFF dipaksa ke unit sendiri.
    let unitId = parsed.data.unitId?.trim();
    if (role === "MANAGER" || role === "STAFF") {
      unitId = session.user.unitId ?? undefined;
    }
    if (!unitId) {
      return NextResponse.json(
        { error: "Unit wajib dipilih" },
        { status: 400 },
      );
    }

    // ---- Validasi unit retail + inventory aktif ----
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, isRetail: true, type: true, lembagaId: true },
    });
    if (!unit) {
      return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 });
    }
    if (unit.isRetail !== true) {
      return NextResponse.json(
        { error: "Pembayaran kartu hanya berlaku di unit retail" },
        { status: 400 },
      );
    }

    // Pimpinan hanya boleh mencatat di unit lembaganya sendiri.
    if (role === "PIMPINAN") {
      const unitInLembaga = await prisma.unit.findFirst({
        where: { id: unitId, lembagaId: session.user.lembagaId },
        select: { id: true },
      });
      if (!unitInLembaga) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const unitSettings = await prisma.unitSetting.findUnique({
      where: { unitId },
    });
    if (!unitSettings?.inventoryEnabled) {
      return NextResponse.json(
        { error: "Unit tidak memiliki inventory yang diaktifkan untuk POS" },
        { status: 400 },
      );
    }

    // ---- Cari santri + akun tabungan aktif via UID kartu ----
    const student = await prisma.student.findUnique({
      where: { cardUid },
      include: {
        account: {
          select: {
            id: true,
            balance: true,
            status: true,
            unitId: true,
            dailySpendLimit: true,
          },
        },
      },
    });

    if (!student || student.isActive !== true) {
      return NextResponse.json(
        { error: "Kartu tidak terdaftar / santri tidak aktif" },
        { status: 404 },
      );
    }
    const account = student.account;
    if (!account || account.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Akun tabungan tidak aktif (CLOSED/FROZEN)" },
        { status: 409 },
      );
    }
    // Batas pemakaian: akun tabungan boleh dipakai di unit asalnya ATAU
    // di unit retail lain yang masih satu lembaga (tabungan KPAK).
    if (account.unitId !== unitId) {
      const accountUnit = await prisma.unit.findUnique({
        where: { id: account.unitId },
        select: { lembagaId: true },
      });
      const sameLembaga =
        !!accountUnit?.lembagaId && accountUnit.lembagaId === unit.lembagaId;
      if (!sameLembaga) {
        return NextResponse.json(
          { error: "Tabungan santri bukan milik unit ini" },
          { status: 403 },
        );
      }
    }

    // ---- Validasi item + hitung total dari DB ----
    const itemIds = parsed.data.items.map((i) => i.itemId);
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, unitId, isActive: true },
      select: {
        id: true,
        name: true,
        currentStock: true,
        unitPrice: true,
      },
    });
    if (inventoryItems.length !== parsed.data.items.length) {
      return NextResponse.json(
        { error: "Ada item yang tidak ditemukan / nonaktif di unit ini" },
        { status: 400 },
      );
    }

    const stockDecrement: { id: string; qty: number }[] = [];
    const orderItemRows: {
      itemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      itemId: string;
    }[] = [];

    let total = 0;
    for (const line of parsed.data.items) {
      const inv = inventoryItems.find((i) => i.id === line.itemId)!;
      const qty = line.quantity;
      if (qty > (inv.currentStock ?? 0)) {
        return NextResponse.json(
          {
            error: `Stok tidak mencukupi untuk ${inv.name}. Tersedia: ${
              inv.currentStock ?? 0
            }`,
          },
          { status: 409 },
        );
      }
      const unitPrice = Number(inv.unitPrice ?? 0);
      const totalPrice = unitPrice * qty;
      total += totalPrice;
      stockDecrement.push({ id: inv.id, qty });
      orderItemRows.push({
        itemName: inv.name,
        quantity: qty,
        unitPrice,
        totalPrice,
        itemId: inv.id,
      });
    }

    // ---- Guard saldo ----
    if (Number(account.balance) < total) {
      return NextResponse.json(
        {
          error: `Saldo tidak cukup. Saldo: ${account.balance}, total belanja: ${total}`,
        },
        { status: 409 },
      );
    }

    // ---- Batas belanja harian (WIB), default NOL = tanpa batas ----
    const dailySpendLimit = Number(account.dailySpendLimit ?? 0);
    if (dailySpendLimit > 0) {
      const spentTodayAgg = await prisma.savingsTransaction.aggregate({
        where: {
          accountId: account.id,
          type: "WITHDRAWAL",
          channel: "SMART_CARD",
          createdAt: { gte: startOfWibDay() },
        },
        _sum: { amount: true },
      });
      const spentToday = Number(spentTodayAgg._sum.amount ?? 0);
      if (spentToday + total > dailySpendLimit) {
        return NextResponse.json(
          {
            error: `Batas belanja harian Rp ${dailySpendLimit.toLocaleString(
              "id-ID",
            )} terlampaui (hari ini sudah Rp ${spentToday.toLocaleString(
              "id-ID",
            )})`,
          },
          { status: 409 },
        );
      }
    }

    // ---- Transaksi atomik: debit saldo + pembukuan + stok ----
    const result = await prisma.$transaction(async (tx) => {
      // Re-check saldo di dalam transaksi (guard terakhir, hindari race).
      const acct = await tx.savingsAccount.findUnique({
        where: { id: account.id },
        select: { balance: true, status: true, dailySpendLimit: true },
      });
      if (!acct || acct.status !== "ACTIVE" || Number(acct.balance) < total) {
        throw new Error("SALDO_TIDAK_CUKUP");
      }
      // Re-check batas belanja harian di dalam transaksi.
      const inTxLimit = Number(acct.dailySpendLimit ?? 0);
      if (inTxLimit > 0) {
        const spentInTxAgg = await tx.savingsTransaction.aggregate({
          where: {
            accountId: account.id,
            type: "WITHDRAWAL",
            channel: "SMART_CARD",
            createdAt: { gte: startOfWibDay() },
          },
          _sum: { amount: true },
        });
        const spentInTx = Number(spentInTxAgg._sum.amount ?? 0);
        if (spentInTx + total > inTxLimit) {
          throw new Error("BATAS_BELANJA_HARIAN");
        }
      }

      const balanceBefore = Number(acct.balance);
      const balanceAfter = balanceBefore - total;

      // 1. Mutasi tabungan (WITHDRAWAL)
      const savingsTx = await tx.savingsTransaction.create({
        data: {
          accountId: account.id,
          unitId,
          type: "WITHDRAWAL",
          amount: total,
          balanceBefore,
          balanceAfter,
          cardUid,
          channel: "SMART_CARD",
          description,
          createdById: session.user.id!,
        },
      });

      // 2. Update saldo tabungan
      await tx.savingsAccount.update({
        where: { id: account.id },
        data: { balance: { decrement: total } },
      });

      // 3. Transaksi keuangan INCOME (dana sudah masuk sistem)
      const finTx = await tx.transaction.create({
        data: {
          unitId,
          type: "INCOME",
          amount: total,
          description,
          paymentMethod: "SMART_CARD",
          reference: savingsTx.id,
          status: "APPROVED",
          createdById: session.user.id!,
          approvedById: session.user.id!,
          approvedAt: new Date(),
          order_items: { create: orderItemRows },
        },
      });

      // 4. Kurangi stok atomik (guard currentStock >= qty)
      for (const s of stockDecrement) {
        const res = await tx.inventoryItem.updateMany({
          where: { id: s.id, currentStock: { gte: s.qty } },
          data: { currentStock: { decrement: s.qty } },
        });
        if (res.count === 0) {
          throw new Error("STOK_BERUBAH_SAAT_CHECKOUT");
        }
      }

      // 5. Referensi silang: mutasi -> id transaksi keuangan
      await tx.savingsTransaction.update({
        where: { id: savingsTx.id },
        data: { reference: finTx.id },
      });

      return {
        transactionId: finTx.id,
        savingsTransactionId: savingsTx.id,
        balanceAfter,
      };
    });

    return NextResponse.json({
      data: {
        ...result,
        student: {
          id: student.id,
          name: student.name,
          studentNumber: student.studentNumber,
        },
        items: orderItemRows,
        total,
        balanceBefore: Number(result.balanceAfter) + total,
      },
    });
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    if (msg === "SALDO_TIDAK_CUKUP") {
      return NextResponse.json(
        { error: "Saldo tidak cukup (berubah saat proses)" },
        { status: 409 },
      );
    }
    if (msg === "BATAS_BELANJA_HARIAN") {
      return NextResponse.json(
        { error: "Batas belanja harian terlampaui" },
        { status: 409 },
      );
    }
    if (msg === "STOK_BERUBAH_SAAT_CHECKOUT") {
      return NextResponse.json(
        { error: "Stok berubah saat checkout. Muat ulang halaman dan coba lagi." },
        { status: 409 },
      );
    }
    console.error("[smartpay] checkout error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}