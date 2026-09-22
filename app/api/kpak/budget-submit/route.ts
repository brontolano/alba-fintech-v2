import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import {
  resolveApprover,
  notifyPendingApproval,
} from "@/lib/approvalRouting";

const submitSchema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  title: z.string().min(1),
  reason: z.string().min(1),
  unitId: z.string().optional(),
});

/**
 * Pengajuan anggaran khusus: SELALU masuk antrean persetujuan
 * (manager -> pimpinan) meski unit diset auto-approve.
 * Transaksi rutin tidak lewat sini (tetap via /api/transactions).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = submitSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  let unitId = session.user.unitId;
  if ((role === "PIMPINAN" || role === "SUPERADMIN") && parsed.data.unitId)
    unitId = parsed.data.unitId;
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  if (role === "MANAGER" && unitId !== session.user.unitId)
    return NextResponse.json(
      { error: "Hanya untuk unit Anda" },
      { status: 403 },
    );

  const category = await prisma.financialCategory.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category || category.type !== "EXPENSE")
    return NextResponse.json(
      { error: "Kategori anggaran tidak valid" },
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

  const isFinalAuthority = role === "PIMPINAN" || role === "SUPERADMIN";
  const description = `${parsed.data.title.trim()} — ${parsed.data.reason.trim()}`;

  const transaction = await prisma.transaction.create({
    data: {
      unitId,
      type: "EXPENSE",
      amount: parsed.data.amount,
      description,
      categoryId: parsed.data.categoryId,
      reference: `ANGGARAN:${Date.now()}`,
      createdById: session.user.id!,
      status: isFinalAuthority ? "APPROVED" : "PENDING",
      approvedById: isFinalAuthority ? session.user.id : undefined,
      approvedAt: isFinalAuthority ? new Date() : undefined,
    },
  });

  if (!isFinalAuthority) {
    const approverId = await resolveApprover(unitId, role);
    if (approverId) {
      await prisma.approval.create({
        data: {
          transactionId: transaction.id,
          approverId,
          unitId,
          status: "PENDING",
        },
      });
      const unitName = await prisma.unit
        .findUnique({ where: { id: unitId }, select: { name: true } })
        .then((u) => u?.name)
        .catch(() => undefined);
      await notifyPendingApproval({
        approverId,
        transactionId: transaction.id,
        description,
        amount: parsed.data.amount,
        creatorName: session.user.name || session.user.email || "Pengguna",
        unitName,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ data: transaction }, { status: 201 });
}
